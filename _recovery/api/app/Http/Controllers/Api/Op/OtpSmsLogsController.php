<?php

namespace App\Http\Controllers\Api\Op;

use App\Http\Controllers\Concerns\PaginatesResponses;
use App\Http\Controllers\Controller;
use App\Models\CustomerProfile;
use App\Models\OtpSmsLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OtpSmsLogsController extends Controller
{
    use PaginatesResponses;

    public function index(Request $request): JsonResponse
    {
        // Base query with all filters EXCEPT status (so counts reflect the full filtered set)
        $baseQuery = OtpSmsLog::query();

        if ($q = $request->query('q')) {
            $baseQuery->where('phone_masked', 'like', "%{$q}%");
        }
        if ($provider = $request->query('provider')) {
            $baseQuery->where('provider', $provider);
        }
        if ($countryCode = $request->query('country_code')) {
            $baseQuery->where('country_code', $countryCode);
        }
        if ($from = $request->query('from')) {
            $baseQuery->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $baseQuery->whereDate('created_at', '<=', $to);
        }

        // Status counts from the filtered set (before applying status filter)
        $counts = (clone $baseQuery)
            ->selectRaw("
                count(*) as total,
                count(*) filter (where status = 'sent') as sent,
                count(*) filter (where status = 'verified') as verified,
                count(*) filter (where status = 'failed') as failed
            ")
            ->first();

        // Now apply status filter for the paginated list
        $query = (clone $baseQuery)->orderByDesc('created_at');
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $paginator = $query->paginate($this->resolvePerPage($request));

        // Batch-lookup customer profiles
        $phones = $paginator->getCollection()->pluck('phone')->unique()->values()->all();
        $profiles = CustomerProfile::whereIn('phone', $phones)
            ->get(['id', 'phone'])
            ->keyBy('phone');

        // Distinct country codes for the filter dropdown
        $countryCodes = OtpSmsLog::distinct()->whereNotNull('country_code')->pluck('country_code')->sort()->values();

        return response()->json([
            'data' => $paginator->through(fn (OtpSmsLog $log) => [
                'id' => $log->id,
                'phone' => $log->phone,
                'phone_masked' => $log->phone_masked,
                'country_code' => $log->country_code,
                'context' => $log->context,
                'device_type' => $log->device_type,
                'provider' => $log->provider,
                'status' => $log->status,
                'error_message' => $log->error_message,
                'customer_profile_id' => $profiles->get($log->phone)?->id,
                'created_at' => $log->created_at?->toIso8601String(),
            ])->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
            'counts' => [
                'total' => (int) ($counts->total ?? 0),
                'sent' => (int) ($counts->sent ?? 0),
                'verified' => (int) ($counts->verified ?? 0),
                'failed' => (int) ($counts->failed ?? 0),
            ],
            'filters' => [
                'country_codes' => $countryCodes,
            ],
        ]);
    }
}
