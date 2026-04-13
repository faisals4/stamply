<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\CardTemplate;
use App\Models\Customer;
use App\Models\CustomerProfile;
use App\Models\IssuedCard;
use App\Models\Stamp;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Public endpoints used by end customers (no auth). Explicitly filters by
 * tenant (since BelongsToTenant global scope doesn't kick in without a user).
 */
class PublicCardController extends Controller
{
    /**
     * GET /api/public/cards/{template}
     *
     * Resolves the slug in this priority:
     *   1. `tenants.subdomain` — returns:
     *      - `kind=card` if the tenant has exactly one active card (same
     *        shape as a direct card lookup, so the Register page can render
     *        it without extra work)
     *      - `kind=catalog` if the tenant has two or more active cards — the
     *        frontend shows a picker that leads to `/c/{card-slug}` for each
     *   2. `card_templates.public_slug` — direct card lookup (legacy path,
     *      always returns `kind=card`)
     *   3. numeric id fallback — same as (2), for back-compat
     */
    public function showTemplate(string $template): JsonResponse
    {
        // 1. Try to resolve as a tenant subdomain first.
        $tenant = Tenant::where('subdomain', $template)
            ->where('is_active', true)
            ->first();

        if ($tenant) {
            $activeCards = CardTemplate::withoutGlobalScope('tenant')
                ->with('rewards')
                ->where('tenant_id', $tenant->id)
                ->where('status', 'active')
                ->orderBy('id')
                ->get();

            if ($activeCards->isEmpty()) {
                abort(404, 'لا توجد بطاقات نشطة لهذا التاجر');
            }

            if ($activeCards->count() === 1) {
                // Single-card tenant → same payload shape as a direct card
                // lookup so the Register page just works.
                return response()->json([
                    'data' => $this->cardPayload($activeCards->first(), $tenant, 'card'),
                ]);
            }

            // Multi-card tenant → catalog shape.
            return response()->json([
                'data' => [
                    'kind' => 'catalog',
                    'tenant' => [
                        'name' => $tenant->name,
                        'subdomain' => $tenant->subdomain,
                        'description' => data_get($tenant->settings, 'branding.description'),
                        'logo' => data_get($tenant->settings, 'branding.logo'),
                    ],
                    'cards' => $activeCards->map(fn ($c) => [
                        'id' => $c->id,
                        'public_slug' => $c->public_slug,
                        'name' => $c->name,
                        'description' => $c->description,
                        'type' => $c->type,
                        'design' => $c->design,
                        'rewards' => $c->rewards->map(fn ($r) => [
                            'id' => $r->id,
                            'name' => $r->name,
                            'stamps_required' => $r->stamps_required,
                        ]),
                    ]),
                ],
            ]);
        }

        // 2/3. Fall back to direct card lookup (legacy path).
        $card = CardTemplate::withoutGlobalScope('tenant')
            ->with(['rewards', 'tenant:id,name,subdomain,settings'])
            ->where('status', 'active')
            ->where(function ($q) use ($template) {
                $q->where('public_slug', $template);
                if (ctype_digit($template)) {
                    $q->orWhere('id', (int) $template);
                }
            })
            ->firstOrFail();

        return response()->json([
            'data' => $this->cardPayload($card, $card->tenant, 'card'),
        ]);
    }

    /**
     * Shared card-shape payload used by both the legacy card lookup and the
     * single-card tenant shortcut.
     */
    private function cardPayload(CardTemplate $card, Tenant $tenant, string $kind): array
    {
        return [
            'kind' => $kind,
            'id' => $card->id,
            'public_slug' => $card->public_slug,
            'name' => $card->name,
            'description' => $card->description,
            'type' => $card->type,
            'design' => $card->design,
            'settings' => $card->settings,
            'rewards' => $card->rewards->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'stamps_required' => $r->stamps_required,
            ]),
            'tenant' => [
                'name' => $tenant->name,
                'subdomain' => $tenant->subdomain,
                'description' => data_get($tenant->settings, 'branding.description'),
                'logo' => data_get($tenant->settings, 'branding.logo'),
            ],
        ];
    }

    /**
     * POST /api/public/cards/{template}/issue
     * Register a customer by phone and issue a card. Accepts slug or id.
     */
    public function issue(Request $request, string $template): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'min:5', 'max:32'],
            'first_name' => ['nullable', 'string', 'max:64'],
            'last_name' => ['nullable', 'string', 'max:64'],
            'email' => ['nullable', 'email', 'max:120'],
            'birthdate' => ['nullable', 'date'],
            'source_utm' => ['nullable', 'string', 'max:255'],
        ]);

        // Resolution order mirrors showTemplate(): tenant subdomain first
        // (for single-card tenants where the register page is served
        // directly from /c/{subdomain}), then card public_slug, then id.
        $tenant = Tenant::where('subdomain', $template)
            ->where('is_active', true)
            ->first();

        if ($tenant) {
            $activeCards = CardTemplate::withoutGlobalScope('tenant')
                ->where('tenant_id', $tenant->id)
                ->where('status', 'active')
                ->orderBy('id')
                ->get();
            if ($activeCards->isEmpty()) {
                abort(404, 'لا توجد بطاقات نشطة لهذا التاجر');
            }
            if ($activeCards->count() > 1) {
                // Multi-card tenants can't register from the catalog page —
                // the customer must pick a specific card first.
                abort(422, 'يجب اختيار بطاقة محدّدة للتسجيل');
            }
            $card = $activeCards->first();
        } else {
            $card = CardTemplate::withoutGlobalScope('tenant')
                ->where('status', 'active')
                ->where(function ($q) use ($template) {
                    $q->where('public_slug', $template);
                    if (ctype_digit($template)) {
                        $q->orWhere('id', (int) $template);
                    }
                })
                ->firstOrFail();
        }

        $tenantId = $card->tenant_id;

        $result = DB::transaction(function () use ($data, $card, $tenantId) {
            // 1. Ensure a CustomerProfile exists for this phone. A
            //    profile is cross-tenant — one row per real person,
            //    identified by phone. If the person already signed
            //    up at another merchant, we reuse their existing
            //    profile here.
            $profile = CustomerProfile::where('phone', $data['phone'])->first();

            if (! $profile) {
                // First time we see this phone — create a fresh
                // profile with whatever fields the customer
                // supplied on the signup form.
                $profile = CustomerProfile::create([
                    'phone' => $data['phone'],
                    'first_name' => $data['first_name'] ?? null,
                    'last_name' => $data['last_name'] ?? null,
                    'email' => $data['email'] ?? null,
                    'birthdate' => $data['birthdate'] ?? null,
                ]);
            } else {
                // Existing profile. Only update fields the customer
                // hasn't locked via the mobile app — locked fields
                // represent "I own this value, don't let any
                // merchant overwrite it". Unlocked fields can be
                // filled in (but not overwritten if already set —
                // we don't want a new merchant signup to blank out
                // an existing customer's name).
                $locked = $profile->locked_fields ?? [];
                $profileUpdates = [];
                foreach (['first_name', 'last_name', 'email', 'birthdate'] as $field) {
                    $incoming = $data[$field] ?? null;
                    if ($incoming === null || $incoming === '') {
                        continue;
                    }
                    if (in_array($field, $locked, true)) {
                        continue; // locked by customer, silently skip
                    }
                    if (! empty($profile->{$field})) {
                        continue; // already set, don't overwrite
                    }
                    $profileUpdates[$field] = $incoming;
                }
                if (! empty($profileUpdates)) {
                    $profile->update($profileUpdates);
                }
            }

            // 2. Ensure a Customer row exists for (tenant, profile).
            //    This is the per-merchant relationship — stamps,
            //    locale, source UTM all live on the customers row.
            $customer = Customer::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('customer_profile_id', $profile->id)
                ->first();

            if (! $customer) {
                $customer = Customer::withoutGlobalScopes()->create([
                    'tenant_id' => $tenantId,
                    'customer_profile_id' => $profile->id,
                    'source_utm' => $data['source_utm'] ?? null,
                    'last_activity_at' => now(),
                ]);
            } else {
                $customer->update(['last_activity_at' => now()]);
            }

            // One issued card per (customer, template)
            $issued = IssuedCard::withoutGlobalScopes()
                ->where('customer_id', $customer->id)
                ->where('card_template_id', $card->id)
                ->first();

            $isNew = false;
            if (! $issued) {
                $isNew = true;
                $welcome = (int) ($card->settings['welcomeStamps'] ?? 0);
                $issued = IssuedCard::withoutGlobalScopes()->create([
                    'tenant_id' => $tenantId,
                    'customer_id' => $customer->id,
                    'card_template_id' => $card->id,
                    'stamps_count' => $welcome,
                    'source_utm' => $data['source_utm'] ?? null,
                ]);

                if ($welcome > 0) {
                    Stamp::withoutGlobalScopes()->create([
                        'tenant_id' => $tenantId,
                        'issued_card_id' => $issued->id,
                        'count' => $welcome,
                        'reason' => 'welcome',
                    ]);
                }
            }

            return ['issued' => $issued, 'customer' => $customer, 'isNew' => $isNew];
        });

        $issued = $result['issued'];

        // Fire automation trigger ONLY when a brand-new card was issued.
        // Re-registrations (same phone + same template) don't re-trigger
        // welcome series.
        if ($result['isNew']) {
            event(new \App\Events\CardIssued($result['customer'], $issued));
        }

        // NOTE: the `welcome` lifecycle trigger is intentionally NOT
        // fired here. iOS only shows a lock-screen notification when a
        // backField value *changes* between pass versions — it stays
        // silent on the first install. Firing welcome here would set
        // announcement_text BEFORE the pass lands on the device, so
        // the very first sync would see the welcome text as the
        // baseline and never emit a notification. Instead, the
        // PassKit `register` endpoint fires welcome on the first
        // device registration for this card, which happens AFTER the
        // baseline install — giving iOS a clean empty→welcome delta
        // to show.

        return response()->json([
            'data' => [
                'serial_number' => $issued->serial_number,
                'view_url' => url('/i/'.$issued->serial_number),
            ],
        ], 201);
    }

    /**
     * GET /api/public/issued/{serial}
     * Returns the public view of an issued card (no auth required).
     *
     * Treats orphaned cards as not-found:
     * - card itself was soft-deleted → 404 (SoftDeletes scope hides it)
     * - customer was soft-deleted (deleted_at is set) → 404
     * - template was hard-deleted (card_template_id became NULL via the
     *   nullOnDelete cascade) → 404
     */
    public function showIssued(string $serial): JsonResponse
    {
        $issued = IssuedCard::withoutGlobalScopes(['App\\Models\\Concerns\\BelongsToTenant'])
            ->with([
                'template.rewards',
                'template.tenant:id,name,subdomain,settings',
                // `customer` is just the tenant ↔ profile link; the
                // personal fields (phone, first_name, last_name,
                // phone_verified_at) live on the profile relation
                // and are proxied back onto the customer model via
                // accessors. We eager-load both so the serialization
                // below doesn't fire a lazy query per field.
                'customer:id,tenant_id,customer_profile_id',
                'customer.profile:id,phone,phone_verified_at,first_name,last_name',
            ])
            ->where('serial_number', $serial)
            ->firstOrFail();

        // Defensive null checks against the orphan-shaped states above.
        if ($issued->customer === null || $issued->template === null) {
            abort(404, 'البطاقة غير متاحة');
        }

        // Platform-wide feature flags (set by the SaaS operator in
        // /op/settings). Currently just `phone_verification` but the
        // shape is open-ended so new flags can flow through without
        // an API contract change. Ships inline with the card payload
        // so the public page only ever makes one request to decide
        // what to render.
        $platformFeatures = app(\App\Services\PlatformSettingsService::class)->get('features');

        return response()->json([
            'data' => [
                'serial_number' => $issued->serial_number,
                'stamps_count' => $issued->stamps_count,
                'status' => $issued->status,
                'issued_at' => $issued->issued_at,
                // How many times this card has been "completed" — i.e. the
                // customer redeemed a reward on it. Counted across ALL
                // rewards on the card template.
                'total_redemptions' => $issued->redemptions()->count(),
                'customer' => [
                    'phone' => $issued->customer->phone,
                    'name' => $issued->customer->full_name,
                    // Null = phone ownership not yet proven via OTP.
                    // An ISO 8601 timestamp = customer clicked the
                    // verify block on /i/:serial and entered the
                    // SMS code successfully. Used by the public card
                    // view to show / hide the verification prompt,
                    // and by the admin customers list to badge
                    // unverified rows.
                    'phone_verified_at' => optional($issued->customer->phone_verified_at)->toIso8601String(),
                ],
                'template' => [
                    'id' => $issued->template->id,
                    'name' => $issued->template->name,
                    'description' => $issued->template->description,
                    'design' => $issued->template->design,
                    'rewards' => $issued->template->rewards->map(fn ($r) => [
                        'id' => $r->id,
                        'name' => $r->name,
                        'stamps_required' => $r->stamps_required,
                    ]),
                ],
                'tenant' => [
                    'name' => $issued->template->tenant->name,
                    'subdomain' => $issued->template->tenant->subdomain,
                    'description' => data_get($issued->template->tenant->settings, 'branding.description'),
                    'logo' => data_get($issued->template->tenant->settings, 'branding.logo'),
                ],
                'features' => [
                    // Default ON — merchants can disable per platform
                    // from /op/settings. Used by the public page to
                    // gate <PhoneVerificationBlock />.
                    'phone_verification' => (bool) ($platformFeatures['phone_verification'] ?? true),
                ],
            ],
        ]);
    }
}
