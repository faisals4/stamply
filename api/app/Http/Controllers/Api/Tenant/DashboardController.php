<?php

namespace App\Http\Controllers\Api\Tenant;

use App\Http\Controllers\Controller;
use App\Models\CardTemplate;
use App\Models\Customer;
use App\Models\IssuedCard;
use App\Models\Redemption;
use App\Models\Stamp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * GET /api/dashboard/stats
     *
     * Tenant-scoped dashboard summary. Optimised for Postgres: instead of
     * issuing 10+ separate `COUNT(*)` round-trips we fan out into 4 single
     * queries that each use `CASE WHEN` aggregations. This pattern relies on
     * the new `(tenant_id, created_at)` indexes added in the postgres-ready
     * migration set.
     */
    public function stats(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $today = now()->startOfDay();
        $weekAgo = now()->subWeek();
        $monthAgo = now()->subMonth();

        // 1) customers — one query, three aggregates.
        $customerStats = Customer::query()
            ->selectRaw('
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE created_at >= ?) AS new_today,
                COUNT(*) FILTER (WHERE created_at >= ?) AS new_month,
                COUNT(*) FILTER (WHERE last_activity_at >= ?) AS active_week
            ', [$today, $monthAgo, $weekAgo])
            ->first();

        // 2) card templates — one query, two aggregates.
        $cardStats = CardTemplate::query()
            ->selectRaw("
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'active') AS active
            ")
            ->first();

        // 3) stamps — one query, two windowed sums.
        // We sum positive counts only (refunds are negative). Without the
        // FILTER predicate Postgres would still scan, but with the new
        // (tenant_id, created_at) index it's an index range scan.
        $stampStats = Stamp::query()
            ->selectRaw('
                COALESCE(SUM(CASE WHEN created_at >= ? AND count > 0 THEN count ELSE 0 END), 0) AS today,
                COALESCE(SUM(CASE WHEN created_at >= ? AND count > 0 THEN count ELSE 0 END), 0) AS week
            ', [$today, $weekAgo])
            ->first();

        // 4) redemptions — total + today.
        $redemptionStats = Redemption::query()
            ->selectRaw("
                COUNT(*) FILTER (WHERE created_at >= ? AND status = 'used') AS today,
                COUNT(*) FILTER (WHERE status = 'used') AS total
            ", [$today])
            ->first();

        // 5) issued cards — single COUNT.
        $issuedCardCount = IssuedCard::count();

        return response()->json([
            'data' => [
                // Top-line counters
                'customers' => (int) $customerStats->total,
                'cards' => (int) $cardStats->total,
                'active_cards' => (int) $cardStats->active,
                'issued_cards' => $issuedCardCount,

                // Today
                'stamps_today' => (int) $stampStats->today,
                'redemptions_today' => (int) $redemptionStats->today,
                'new_customers_today' => (int) $customerStats->new_today,

                // Week
                'stamps_week' => (int) $stampStats->week,
                'active_customers_week' => (int) $customerStats->active_week,

                // Month
                'new_customers_month' => (int) $customerStats->new_month,
                'total_rewards_redeemed' => (int) $redemptionStats->total,

                // Upcoming birthdays (within next 7 days, for engagement)
                'upcoming_birthdays_week' => $this->upcomingBirthdaysCount($tenantId),
            ],
        ]);
    }

    /**
     * Single-query birthday counter using PostgreSQL's date_part. Counts
     * customers whose birthday's (month, day) tuple lands in the next 7 days,
     * including today. Works across year boundaries.
     */
    private function upcomingBirthdaysCount(int $tenantId): int
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            // The 7-day window is computed in PHP and passed in as parameters
            // so the DB just does a single bounded scan.
            $now = now();
            $window = collect();
            for ($i = 0; $i < 7; $i++) {
                $d = $now->copy()->addDays($i);
                $window->push(['m' => $d->month, 'd' => $d->day]);
            }

            // birthdate lives on customer_profiles; pivot via whereHas
            // so the outer tenant scope still applies to customers.
            $query = Customer::query()->whereHas('profile', function ($q) use ($window) {
                $q->whereNotNull('birthdate')
                    ->where(function ($inner) use ($window) {
                        foreach ($window as $point) {
                            $inner->orWhere(function ($w) use ($point) {
                                $w->whereRaw('EXTRACT(MONTH FROM birthdate) = ?', [$point['m']])
                                    ->whereRaw('EXTRACT(DAY FROM birthdate) = ?', [$point['d']]);
                            });
                        }
                    });
            });

            return $query->count();
        }

        // SQLite fallback (used by older test envs).
        $today = now();
        $count = 0;
        for ($i = 0; $i < 7; $i++) {
            $d = $today->copy()->addDays($i);
            $count += Customer::whereHas('profile', fn ($q) => $q
                ->whereMonth('birthdate', $d->month)
                ->whereDay('birthdate', $d->day)
            )->count();
        }
        return $count;
    }
}
