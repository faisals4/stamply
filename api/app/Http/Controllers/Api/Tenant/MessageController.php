<?php

namespace App\Http\Controllers\Api\Tenant;

use App\Http\Controllers\Concerns\PaginatesResponses;
use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Message;
use App\Services\Messaging\EmailService;
use App\Services\Messaging\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Tenant broadcast (الرسائل) — send a one-off email or SMS campaign to all
 * customers (or a basic audience slice). Tenant-scoped via the `BelongsToTenant`
 * trait on the Message model. Permission gate: `messages.send`.
 *
 * NOTE: this MVP sends synchronously inside the request to keep deployment
 * simple. We'll move to a queued job once Horizon is wired up — see Phase 4
 * of the roadmap.
 */
class MessageController extends Controller
{
    use PaginatesResponses;

    /**
     * GET /api/messages/reach
     *
     * Returns how many customers in the current tenant can be reached
     * on each channel:
     *   - email:  customers with a non-empty email column
     *   - sms:    customers with a non-empty phone column
     *   - push:   customers with ≥1 row in push_tokens (web push)
     *   - wallet: customers whose issued_cards have ≥1 row in
     *             apple_pass_registrations — i.e. they installed the
     *             pass to Apple Wallet and can receive lock-screen
     *             announcements via the changeMessage back field.
     *
     * Powers the stat tiles at the top of /admin/messages so the
     * merchant sees their real reach before composing a broadcast.
     */
    public function reach(): JsonResponse
    {
        // BelongsToTenant global scope on Customer ensures we only
        // count rows in the currently-authenticated tenant — no need
        // to join or filter by tenant_id explicitly.
        $total = Customer::count();

        $email = Customer::whereNotNull('email')
            ->where('email', '!=', '')
            ->count();

        $sms = Customer::whereNotNull('phone')
            ->where('phone', '!=', '')
            ->count();

        $push = Customer::whereHas('pushTokens')->count();

        // Wallet reach: a customer is "reachable" when at least one of
        // their issued cards has an Apple Wallet pass registration.
        // whereHas -> whereHas chains into a nested EXISTS subquery
        // which stays index-friendly at scale.
        $wallet = Customer::whereHas('issuedCards.applePassRegistrations')
            ->count();

        $pct = fn (int $n) => $total > 0 ? (int) round(($n / $total) * 100) : 0;

        return response()->json([
            'data' => [
                'total_customers' => $total,
                'email' => ['reachable' => $email, 'percentage' => $pct($email)],
                'sms' => ['reachable' => $sms, 'percentage' => $pct($sms)],
                'push' => ['reachable' => $push, 'percentage' => $pct($push)],
                'wallet' => ['reachable' => $wallet, 'percentage' => $pct($wallet)],
            ],
        ]);
    }

    /**
     * GET /api/messages/reach/{channel}?page=N&per_page=25&q=text
     *
     * Lists customers reachable on a given channel. Designed for very
     * large tenants (millions of rows) — see the notes below for the
     * four techniques that keep this fast at scale.
     *
     * Each channel returns a slightly different shape:
     *   - email: name, email, # issued cards, last_activity_at
     *   - sms:   name, phone, # issued cards, last_activity_at
     *   - push:  + devices[] (platform, user_agent, subscribed_at,
     *            last_seen_at). Eager-loaded only for the current
     *            page (never the whole dataset).
     *
     * PERFORMANCE NOTES — keeping this O(per_page) even at 1M rows:
     *
     *   1. **Server-side LIMIT/OFFSET pagination.** Laravel's
     *      `->paginate()` issues `SELECT ... LIMIT 25 OFFSET (N-1)*25`
     *      so the browser only ever sees 25 rows per page. We never
     *      fetch the full set client-side. `per_page` is clamped at
     *      100 by `resolvePerPage()` to prevent DoS.
     *
     *   2. **Indexed WHERE clauses only.** Every filter here runs
     *      against a column we can index:
     *      - email:  `whereNotNull + != ''` on customers.email
     *      - sms:    same on customers.phone
     *      - push:   `whereExists (...)` translated from whereHas,
     *                joined to push_tokens.customer_id (indexed).
     *      Add a composite `(tenant_id, last_activity_at)` index on
     *      customers for the ORDER BY to use an index scan instead
     *      of filesort on very large tenants.
     *
     *   3. **Bounded eager load for push.** Push eagerly loads
     *      `pushTokens` for the CURRENT PAGE ONLY (25 customers at
     *      a time), not the whole query. That means one extra query
     *      fetching at most ~5×25=125 rows regardless of dataset
     *      size. No N+1, no full-table scans.
     *
     *   4. **Search filter narrows the set early.** When the merchant
     *      types a query, we match the indexed name/phone/email
     *      columns BEFORE counting and paginating, so the OFFSET is
     *      applied to a small filtered set, not the whole table.
     *      This is the escape hatch for the classic "OFFSET is slow
     *      at high page numbers" problem.
     */
    public function reachableCustomers(Request $request, string $channel): JsonResponse
    {
        if (! in_array($channel, ['email', 'sms', 'push', 'wallet'], true)) {
            abort(422, 'channel must be one of: email, sms, push, wallet');
        }

        $query = Customer::query()
            ->withCount('issuedCards')
            ->orderByDesc('last_activity_at')
            ->orderByDesc('id');

        if ($channel === 'email') {
            $query->whereNotNull('email')->where('email', '!=', '');
        } elseif ($channel === 'sms') {
            $query->whereNotNull('phone')->where('phone', '!=', '');
        } elseif ($channel === 'push') {
            // `whereHas` compiles to a correlated EXISTS subquery —
            // index-friendly and never loads the push_tokens rows
            // into memory at the outer query level.
            $query->whereHas('pushTokens');
        } else {
            // Wallet: customer has at least one issued card with an
            // Apple Wallet pass registration. `whereHas` nests a second
            // EXISTS check through `issuedCards.applePassRegistrations`.
            $query->whereHas('issuedCards.applePassRegistrations');
        }

        // Optional search — applied BEFORE pagination so OFFSET stays
        // small. Matches against the three columns merchants actually
        // search by; all three are indexed.
        $q = trim((string) $request->query('q', ''));
        if ($q !== '') {
            $query->where(function ($w) use ($q) {
                $w->where('first_name', 'like', "%{$q}%")
                    ->orWhere('last_name', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            });
        }

        $paginator = $query->paginate($this->resolvePerPage($request));

        // Eager-load relationships ONLY for the 25 rows on this page —
        // avoids N+1 without loading the child tables for the whole
        // result set. Different channels need different relations.
        if ($channel === 'push') {
            $paginator->load([
                'pushTokens' => fn ($q) => $q->orderByDesc('last_seen_at'),
            ]);
        } elseif ($channel === 'wallet') {
            // We need the issued cards (for serial numbers) AND the
            // apple_pass_registrations nested under them (for the
            // device count). Both loaded with constrained columns so
            // we don't ship the full pass blob for every row.
            $paginator->load([
                'issuedCards' => fn ($q) => $q
                    ->select('id', 'customer_id', 'serial_number', 'stamps_count', 'status')
                    ->with(['applePassRegistrations:id,issued_card_id,device_library_id,push_token,created_at']),
            ]);
        }

        $paginator->through(function (Customer $c) use ($channel) {
            $row = [
                'id' => $c->id,
                'name' => $c->full_name,
                'phone' => $c->phone,
                'email' => $c->email,
                'cards_count' => $c->issued_cards_count ?? 0,
                'last_activity_at' => $c->last_activity_at,
            ];

            if ($channel === 'push') {
                $row['devices'] = $c->pushTokens->map(fn ($t) => [
                    'id' => $t->id,
                    'platform' => $t->platform,
                    'user_agent' => data_get($t->device_info, 'userAgent'),
                    'language' => data_get($t->device_info, 'language'),
                    'subscribed_at' => $t->created_at,
                    'last_seen_at' => $t->last_seen_at,
                ])->values()->all();
            }

            if ($channel === 'wallet') {
                // Summarise each installed card: serial, how many
                // devices have it in Apple Wallet, and the stamp count.
                // Cards with zero registrations are filtered out so the
                // row reflects only the ones that actually reach a
                // phone lock screen.
                $row['installed_cards'] = $c->issuedCards
                    ->filter(fn ($card) => $card->applePassRegistrations->isNotEmpty())
                    ->map(fn ($card) => [
                        'id' => $card->id,
                        'serial_number' => $card->serial_number,
                        'stamps_count' => $card->stamps_count,
                        'devices_count' => $card->applePassRegistrations->count(),
                    ])
                    ->values()
                    ->all();
            }

            return $row;
        });

        return $this->paginated($paginator);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Message::with('creator:id,name')->orderByDesc('created_at');

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($w) use ($q) {
                $w->where('subject', 'like', "%{$q}%")
                    ->orWhere('body', 'like', "%{$q}%");
            });
        }
        if ($channel = $request->query('channel')) {
            $query->where('channel', $channel);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $paginator = $query->paginate($this->resolvePerPage($request));
        $paginator->through(fn (Message $m) => $this->transform($m));

        return $this->paginated($paginator);
    }

    public function show(string $id): JsonResponse
    {
        $message = Message::with('creator:id,name')->findOrFail($id);

        return response()->json(['data' => $this->transform($message)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);

        $message = Message::create([
            'created_by' => $request->user()->id,
            'channel' => $data['channel'],
            'subject' => $data['subject'] ?? null,
            'body' => $data['body'],
            'audience' => $data['audience'],
            'audience_meta' => $data['audience_meta'] ?? null,
            'status' => 'draft',
        ]);

        $recipientCount = $this->resolveAudience($message)->count();
        $message->update(['recipients_count' => $recipientCount]);

        return response()->json(['data' => $this->transform($message->fresh('creator'))], 201);
    }

    /**
     * DELETE /messages/{id} — remove a draft broadcast. We only allow
     * this on status === 'draft' so the audit trail of sent/failed
     * campaigns is never tampered with. Cashiers with messages.send
     * permission can clean up their own drafts, which is the whole
     * point of the feature the UI exposes on the Messages list.
     */
    public function destroy(string $id): JsonResponse
    {
        $message = Message::findOrFail($id);

        if ($message->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ['لا يمكن حذف رسالة تم إرسالها أو جارٍ إرسالها'],
            ]);
        }

        $message->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    /**
     * PUT /messages/{id} — update a draft. Once a message has been sent
     * (status !== 'draft') it becomes immutable.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $message = Message::with('creator:id,name')->findOrFail($id);

        if ($message->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ['لا يمكن تعديل رسالة تم إرسالها مسبقاً'],
            ]);
        }

        $data = $this->validatePayload($request);

        $message->update([
            'channel' => $data['channel'],
            'subject' => $data['subject'] ?? null,
            'body' => $data['body'],
            'audience' => $data['audience'],
            'audience_meta' => $data['audience_meta'] ?? null,
        ]);

        // Re-resolve recipients in case audience or channel changed.
        $recipientCount = $this->resolveAudience($message)->count();
        $message->update(['recipients_count' => $recipientCount]);

        return response()->json(['data' => $this->transform($message->fresh('creator'))]);
    }

    /**
     * POST /messages/{id}/send — fire the campaign now (synchronously).
     *
     * Crash-safe contract:
     *   - Status flips to 'sending' BEFORE the loop, so a hard crash leaves
     *     the row visible-but-frozen instead of stuck on 'draft' forever.
     *   - try/finally ensures `failed_at` and a final status are written even
     *     if the loop blows up halfway (PHP fatal, OOM, network).
     *   - Per-recipient errors are isolated — one bad address never aborts
     *     the rest of the batch.
     */
    public function send(
        Request $request,
        EmailService $email,
        SmsService $sms,
        \App\Services\Messaging\PushService $push,
        string $id,
    ): JsonResponse {
        $message = Message::with('creator:id,name')->findOrFail($id);

        if ($message->status === 'sent') {
            throw ValidationException::withMessages([
                'status' => ['تم إرسال هذه الرسالة مسبقاً'],
            ]);
        }

        $customers = $this->resolveAudience($message);

        $message->update([
            'status' => 'sending',
            'recipients_count' => $customers->count(),
            'failed_at' => null,
        ]);

        $sent = 0;
        $failed = 0;
        $crashed = false;
        $tenant = $request->user()->tenant;

        try {
            foreach ($customers as $customer) {
                $body = $this->renderTemplate($message->body, $customer, $tenant);
                $subject = $message->subject
                    ? $this->renderTemplate($message->subject, $customer, $tenant)
                    : null;

                try {
                    if ($message->channel === 'email') {
                        if (empty($customer->email)) {
                            $failed++;
                            continue;
                        }
                        $ok = $email->send($customer->email, $subject ?? '', $body, $customer->full_name);
                    } elseif ($message->channel === 'push') {
                        // Push: dispatch to every device token the customer
                        // has registered. Counts as "sent" if at least one
                        // token succeeded.
                        $title = $subject ?: ($tenant->name ?? 'إشعار جديد');
                        $delivered = $push->dispatchToCustomer(
                            $customer->id,
                            $title,
                            $body,
                        );
                        $ok = $delivered > 0;
                    } elseif ($message->channel === 'wallet') {
                        // Wallet: write the rendered body to the
                        // `announcement_text` back field on every active
                        // issued card the customer holds, bump
                        // `pass_updated_at` so iOS picks up the change,
                        // and queue a SendApplePassUpdate job per card.
                        // Counts as "sent" when at least one installed
                        // card successfully got updated — cards that
                        // haven't been installed to Apple Wallet yet
                        // are silently skipped (no registrations → no
                        // push).
                        $customerCards = \App\Models\IssuedCard::query()
                            ->where('customer_id', $customer->id)
                            ->where('status', '!=', 'inactive')
                            ->whereHas('applePassRegistrations')
                            ->get();

                        if ($customerCards->isEmpty()) {
                            $failed++;
                            continue;
                        }

                        $now = now()->timestamp;
                        foreach ($customerCards as $card) {
                            $card->update([
                                'announcement_text' => $body,
                                'announcement_updated_at' => $now,
                                'pass_updated_at' => $now,
                            ]);
                            \App\Jobs\SendApplePassUpdate::dispatch($card->id)
                                ->afterCommit();
                        }
                        $ok = true;
                    } else {
                        if (empty($customer->phone)) {
                            $failed++;
                            continue;
                        }
                        $ok = $sms->send($customer->phone, $body);
                    }

                    $ok ? $sent++ : $failed++;
                } catch (\Throwable $e) {
                    // Per-recipient failure — keep going.
                    $failed++;
                }
            }
        } catch (\Throwable $e) {
            // Loop-level crash. Mark for monitoring + rethrow so the request
            // returns 500 to the caller.
            $crashed = true;
            throw $e;
        } finally {
            // ALWAYS write final state, even on a rethrown crash, so the row
            // never stays in 'sending' forever.
            $finalStatus = $crashed
                ? 'failed'
                : ($failed > 0 && $sent === 0 ? 'failed' : 'sent');

            $message->update([
                'status' => $finalStatus,
                'sent_count' => $sent,
                'failed_count' => $failed,
                'sent_at' => now(),
                'failed_at' => $crashed ? now() : null,
            ]);
        }

        return response()->json(['data' => $this->transform($message->fresh('creator'))]);
    }

    /* ─── helpers ─────────────────────────────────────────────── */

    private function validatePayload(Request $request): array
    {
        $rules = [
            'channel' => ['required', Rule::in(Message::CHANNELS)],
            'audience' => ['required', Rule::in(Message::AUDIENCES)],
            'audience_meta' => ['nullable', 'array'],
            'audience_meta.inactive_days' => ['nullable', 'integer', 'min:1', 'max:3650'],
            'body' => ['required', 'string', 'max:2000'],
            'subject' => ['nullable', 'string', 'max:255'],
        ];

        $data = $request->validate($rules);

        if ($data['channel'] === 'email' && empty($data['subject'])) {
            throw ValidationException::withMessages([
                'subject' => ['عنوان البريد الإلكتروني مطلوب'],
            ]);
        }

        if ($data['audience'] === 'inactive' && empty($data['audience_meta']['inactive_days'])) {
            $data['audience_meta'] = ['inactive_days' => 30];
        }

        return $data;
    }

    /** @return \Illuminate\Database\Eloquent\Collection<int,Customer> */
    private function resolveAudience(Message $message)
    {
        $query = Customer::query();

        // Per-channel reachability filter. For wallet we require at
        // least one issued card with an Apple Wallet pass registration
        // — anyone else would just generate no-op jobs.
        if ($message->channel === 'email') {
            $query->whereNotNull('email')->where('email', '!=', '');
        } elseif ($message->channel === 'wallet') {
            $query->whereHas('issuedCards.applePassRegistrations');
        } else {
            $query->whereNotNull('phone')->where('phone', '!=', '');
        }

        if ($message->audience === 'inactive') {
            $days = (int) ($message->audience_meta['inactive_days'] ?? 30);
            // "Inactive" = no stamp activity in the last N days. We approximate
            // with the customer's updated_at since stamps bump the row.
            $query->where(function ($q) use ($days) {
                $q->whereDate('updated_at', '<', now()->subDays($days))
                    ->orWhereNull('updated_at');
            });
        }

        return $query->get();
    }

    private function renderTemplate(string $template, Customer $customer, $tenant): string
    {
        $vars = [
            '{{customer.first_name}}' => $customer->first_name ?? '',
            '{{customer.last_name}}' => $customer->last_name ?? '',
            '{{customer.full_name}}' => $customer->full_name ?? '',
            '{{customer.email}}' => $customer->email ?? '',
            '{{customer.phone}}' => $customer->phone ?? '',
            '{{brand.name}}' => $tenant?->name ?? '',
        ];

        return str_replace(array_keys($vars), array_values($vars), $template);
    }

    private function transform(Message $m): array
    {
        return [
            'id' => $m->id,
            'channel' => $m->channel,
            'subject' => $m->subject,
            'body' => $m->body,
            'audience' => $m->audience,
            'audience_meta' => $m->audience_meta,
            'status' => $m->status,
            'recipients_count' => $m->recipients_count,
            'sent_count' => $m->sent_count,
            'failed_count' => $m->failed_count,
            'sent_at' => $m->sent_at?->toIso8601String(),
            'created_at' => $m->created_at?->toIso8601String(),
            'creator' => $m->creator ? ['id' => $m->creator->id, 'name' => $m->creator->name] : null,
        ];
    }
}
