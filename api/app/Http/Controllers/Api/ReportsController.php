<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\PaginatesResponses;
use App\Http\Controllers\Controller;
use App\Models\CardTemplate;
use App\Models\Customer;
use App\Models\IssuedCard;
use App\Models\Redemption;
use App\Models\Stamp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Tenant analytics + CSV exports.
 *
 * - GET /api/reports/summary       → JSON snapshot for the dashboard widgets
 * - GET /api/reports/customers.csv → all customers as CSV download
 * - GET /api/reports/stamps.csv    → all stamps as CSV download
 * - GET /api/reports/redemptions.csv → all redemptions as CSV download
 *
 * Permission gates: `reports.view` for the JSON, `reports.export` for CSVs.
 * Tenant scoping is automatic via the BelongsToTenant trait on each model.
 */
class ReportsController extends Controller
{
    use PaginatesResponses;

    /**
     * Aggregate counters + 14-day trend lines for the Reports page header.
     *
     * Optimised for Postgres: 4 single queries with windowed aggregations
     * (one per table) instead of the previous ~15 separate COUNT round-trips.
     * The new `(tenant_id, created_at)` indexes on stamps, customers, and
     * redemptions make the bounded window scans cheap.
     */
    public function summary(): JsonResponse
    {
        $now = Carbon::now();
        $start = $now->copy()->subDays(13)->startOfDay();
        $today = $now->copy()->startOfDay();
        $weekAgo = $now->copy()->subDays(7);

        // 1) stamps trend (14 days, grouped by date) — single query.
        $stampsByDay = Stamp::whereBetween('created_at', [$start, $now])
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')
            ->groupBy('d')
            ->pluck('c', 'd')
            ->toArray();

        // 2) customers trend (14 days, grouped by date) — single query.
        $customersByDay = Customer::whereBetween('created_at', [$start, $now])
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')
            ->groupBy('d')
            ->pluck('c', 'd')
            ->toArray();

        $stampsTrend = [];
        $customersTrend = [];
        for ($i = 13; $i >= 0; $i--) {
            $key = $now->copy()->subDays($i)->toDateString();
            $stampsTrend[] = ['date' => $key, 'count' => (int) ($stampsByDay[$key] ?? 0)];
            $customersTrend[] = ['date' => $key, 'count' => (int) ($customersByDay[$key] ?? 0)];
        }

        // 3) Top 5 cards by issued count — withCount + orderBy + limit.
        $topCards = CardTemplate::withCount('issuedCards')
            ->orderByDesc('issued_cards_count')
            ->limit(5)
            ->get(['id', 'name', 'status'])
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'status' => $c->status,
                'issued_count' => $c->issued_cards_count,
            ]);

        // 4) totals — fan out into 4 single queries with FILTER aggregations.
        // (Each table is its own query because Postgres can't aggregate across
        // unrelated tables without a JOIN/UNION, but at least it's 4 not 15.)
        $customerTotals = Customer::query()
            ->selectRaw('
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE created_at >= ?) AS week
            ', [$weekAgo])
            ->first();

        $cardTotal = CardTemplate::count();
        $issuedCardTotal = IssuedCard::count();

        $stampTotals = Stamp::query()
            ->selectRaw('
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE created_at >= ?) AS today,
                COUNT(*) FILTER (WHERE created_at >= ?) AS week
            ', [$today, $weekAgo])
            ->first();

        $redemptionTotal = Redemption::count();

        return response()->json([
            'data' => [
                'totals' => [
                    'customers' => (int) $customerTotals->total,
                    'cards' => $cardTotal,
                    'issued_cards' => $issuedCardTotal,
                    'stamps' => (int) $stampTotals->total,
                    'redemptions' => $redemptionTotal,
                    'stamps_today' => (int) $stampTotals->today,
                    'stamps_week' => (int) $stampTotals->week,
                    'customers_week' => (int) $customerTotals->week,
                ],
                'stamps_trend' => $stampsTrend,
                'customers_trend' => $customersTrend,
                'top_cards' => $topCards,
            ],
        ]);
    }

    public function exportCustomers(): StreamedResponse
    {
        return $this->stream('stamply-customers-' . now()->toDateString() . '.csv', function () {
            $out = fopen('php://output', 'w');
            // UTF-8 BOM so Excel opens Arabic correctly.
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['ID', 'الاسم', 'الجوال', 'البريد', 'تاريخ الميلاد', 'تاريخ التسجيل']);

            Customer::orderBy('id')->chunk(500, function ($rows) use ($out) {
                foreach ($rows as $c) {
                    fputcsv($out, [
                        $c->id,
                        $c->full_name,
                        $c->phone,
                        $c->email,
                        $c->birthdate,
                        $c->created_at?->toDateTimeString(),
                    ]);
                }
            });

            fclose($out);
        });
    }

    public function exportStamps(): StreamedResponse
    {
        return $this->stream('stamply-stamps-' . now()->toDateString() . '.csv', function () {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['ID', 'البطاقة المصدّرة', 'العميل', 'العدد', 'السبب', 'بواسطة', 'التاريخ']);

            Stamp::with(['issuedCard.customer', 'givenBy'])
                ->orderBy('id')
                ->chunk(500, function ($rows) use ($out) {
                    foreach ($rows as $s) {
                        fputcsv($out, [
                            $s->id,
                            $s->issued_card_id,
                            $s->issuedCard?->customer?->full_name ?? '',
                            $s->count,
                            $s->reason ?? '',
                            $s->givenBy?->name ?? '',
                            $s->created_at?->toDateTimeString(),
                        ]);
                    }
                });

            fclose($out);
        });
    }

    public function exportRedemptions(): StreamedResponse
    {
        return $this->stream('stamply-redemptions-' . now()->toDateString() . '.csv', function () {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['ID', 'البطاقة', 'العميل', 'المكافأة', 'الكود', 'الحالة', 'التاريخ']);

            Redemption::with(['issuedCard.customer', 'reward'])
                ->orderBy('id')
                ->chunk(500, function ($rows) use ($out) {
                    foreach ($rows as $r) {
                        fputcsv($out, [
                            $r->id,
                            $r->issued_card_id,
                            $r->issuedCard?->customer?->full_name ?? '',
                            $r->reward?->name ?? '',
                            $r->code ?? '',
                            $r->status ?? '',
                            $r->created_at?->toDateTimeString(),
                        ]);
                    }
                });

            fclose($out);
        });
    }

    /* ────────────────────────────────────────────────────────────── */
    /*  Paginated drill-down reports (behind the dashboard stat cards)  */
    /* ────────────────────────────────────────────────────────────── */

    /**
     * GET /api/reports/stamps
     *
     * Paginated stamp log across the whole tenant. The index
     * `(tenant_id, created_at)` makes the ORDER BY + pagination cheap even at
     * millions of rows.
     *
     * Filters: q (customer name/phone), reason, card_template_id,
     *          given_by_user_id, from, to
     */
    public function stamps(Request $request): JsonResponse
    {
        $query = Stamp::with([
            'issuedCard.customer:id,first_name,last_name,phone',
            'issuedCard.template:id,name',
            'givenBy:id,name',
        ])->orderByDesc('created_at');

        if ($reason = $request->query('reason')) {
            $query->where('reason', $reason);
        }
        if ($templateId = $request->query('card_template_id')) {
            $query->whereHas('issuedCard', fn ($q) => $q->where('card_template_id', (int) $templateId));
        }
        if ($byUser = $request->query('given_by_user_id')) {
            $query->where('given_by_user_id', (int) $byUser);
        }
        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }
        if ($q = trim((string) $request->query('q', ''))) {
            $query->whereHas('issuedCard.customer', function ($c) use ($q) {
                $c->where('phone', 'like', "%{$q}%")
                    ->orWhere('first_name', 'like', "%{$q}%")
                    ->orWhere('last_name', 'like', "%{$q}%");
            });
        }

        $paginator = $query->paginate($this->resolvePerPage($request));

        $paginator->through(fn (Stamp $s) => [
            'id' => $s->id,
            'count' => $s->count,
            'reason' => $s->reason,
            'created_at' => $s->created_at,
            'customer' => $s->issuedCard?->customer
                ? [
                    'id' => $s->issuedCard->customer->id,
                    'name' => $s->issuedCard->customer->full_name,
                    'phone' => $s->issuedCard->customer->phone,
                ]
                : null,
            'card_template' => $s->issuedCard?->template
                ? [
                    'id' => $s->issuedCard->template->id,
                    'name' => $s->issuedCard->template->name,
                ]
                : null,
            'serial_number' => $s->issuedCard?->serial_number,
            'given_by' => $s->givenBy ? ['id' => $s->givenBy->id, 'name' => $s->givenBy->name] : null,
        ]);

        return $this->paginated($paginator);
    }

    /**
     * GET /api/reports/redemptions
     *
     * Paginated reward-redemption log across the tenant.
     * Filters: q, card_template_id, used_by_user_id, from, to
     */
    public function redemptions(Request $request): JsonResponse
    {
        $query = Redemption::with([
            'issuedCard.customer:id,first_name,last_name,phone',
            'issuedCard.template:id,name',
            'reward:id,name,stamps_required',
            'usedBy:id,name',
        ])->orderByDesc('created_at');

        if ($templateId = $request->query('card_template_id')) {
            $query->whereHas('issuedCard', fn ($q) => $q->where('card_template_id', (int) $templateId));
        }
        if ($byUser = $request->query('used_by_user_id')) {
            $query->where('used_by_user_id', (int) $byUser);
        }
        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }
        if ($q = trim((string) $request->query('q', ''))) {
            $query->whereHas('issuedCard.customer', function ($c) use ($q) {
                $c->where('phone', 'like', "%{$q}%")
                    ->orWhere('first_name', 'like', "%{$q}%")
                    ->orWhere('last_name', 'like', "%{$q}%");
            });
        }

        $paginator = $query->paginate($this->resolvePerPage($request));

        $paginator->through(fn (Redemption $r) => [
            'id' => $r->id,
            'code' => $r->code,
            'status' => $r->status,
            'used_at' => $r->used_at,
            'created_at' => $r->created_at,
            'customer' => $r->issuedCard?->customer
                ? [
                    'id' => $r->issuedCard->customer->id,
                    'name' => $r->issuedCard->customer->full_name,
                    'phone' => $r->issuedCard->customer->phone,
                ]
                : null,
            'card_template' => $r->issuedCard?->template
                ? ['id' => $r->issuedCard->template->id, 'name' => $r->issuedCard->template->name]
                : null,
            'reward' => $r->reward
                ? [
                    'id' => $r->reward->id,
                    'name' => $r->reward->name,
                    'stamps_required' => $r->reward->stamps_required,
                ]
                : null,
            'used_by' => $r->usedBy ? ['id' => $r->usedBy->id, 'name' => $r->usedBy->name] : null,
            'serial_number' => $r->issuedCard?->serial_number,
        ]);

        return $this->paginated($paginator);
    }

    /**
     * GET /api/reports/issued-cards
     *
     * Paginated list of every issued card across the tenant, with customer +
     * template info and per-card totals.
     * Filters: q, card_template_id, status, from, to
     */
    public function issuedCards(Request $request): JsonResponse
    {
        // Use an alias for the stamps count so it doesn't clobber the
        // issued_cards.stamps_count column on the model.
        $query = IssuedCard::with([
            'customer:id,first_name,last_name,phone',
            'template:id,name,type',
        ])
            ->withCount(['stamps as stamp_events_count', 'redemptions'])
            ->orderByDesc('issued_at');

        if ($templateId = $request->query('card_template_id')) {
            $query->where('card_template_id', (int) $templateId);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($from = $request->query('from')) {
            $query->whereDate('issued_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->whereDate('issued_at', '<=', $to);
        }
        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($w) use ($q) {
                $w->where('serial_number', 'like', "%{$q}%")
                    ->orWhereHas('customer', function ($c) use ($q) {
                        $c->where('phone', 'like', "%{$q}%")
                            ->orWhere('first_name', 'like', "%{$q}%")
                            ->orWhere('last_name', 'like', "%{$q}%");
                    });
            });
        }

        $paginator = $query->paginate($this->resolvePerPage($request));

        $paginator->through(fn (IssuedCard $ic) => [
            'id' => $ic->id,
            'serial_number' => $ic->serial_number,
            'stamps_count' => $ic->stamps_count,
            'status' => $ic->status,
            'issued_at' => $ic->issued_at,
            'last_used_at' => $ic->last_used_at,
            'customer' => $ic->customer
                ? [
                    'id' => $ic->customer->id,
                    'name' => $ic->customer->full_name,
                    'phone' => $ic->customer->phone,
                ]
                : null,
            'card_template' => $ic->template
                ? ['id' => $ic->template->id, 'name' => $ic->template->name, 'type' => $ic->template->type]
                : null,
            'totals' => [
                'stamp_events' => $ic->stamp_events_count,
                'redemptions' => $ic->redemptions_count,
            ],
        ]);

        return $this->paginated($paginator);
    }

    /** Wrap a callable as a streaming CSV response with the given filename. */
    private function stream(string $filename, callable $callback): StreamedResponse
    {
        return response()->streamDownload($callback, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
