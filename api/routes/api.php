<?php

use App\Http\Controllers\Api\App\CustomerAuthController as AppCustomerAuthController;
use App\Http\Controllers\Api\App\CustomerCardsController as AppCustomerCardsController;
use App\Http\Controllers\Api\App\CustomerProfileController as AppCustomerProfileController;
use App\Http\Controllers\Api\Tenant\AuthController;
use App\Http\Controllers\Api\Tenant\AutomationController;
use App\Http\Controllers\Api\Tenant\CardController;
use App\Http\Controllers\Api\Tenant\CashierController;
use App\Http\Controllers\Api\Tenant\CustomerController;
use App\Http\Controllers\Api\Tenant\DashboardController;
use App\Http\Controllers\Api\Tenant\EmailTemplateController;
use App\Http\Controllers\Api\Tenant\IntegrationsController;
use App\Http\Controllers\Api\Tenant\LocationController;
use App\Http\Controllers\Api\Tenant\MessageController;
use App\Http\Controllers\Api\Tenant\PermissionsController;
use App\Http\Controllers\Api\Tenant\ProfileController;
use App\Http\Controllers\Api\Tenant\ReportsController;
use App\Http\Controllers\Api\Public\PublicCardController;
use App\Http\Controllers\Api\Public\PublicPushTokenController;
use App\Http\Controllers\Api\Tenant\StaffController;
use App\Http\Controllers\Api\Wallet\ApplePassKitController;
use App\Http\Controllers\Api\Wallet\WalletController;
use Illuminate\Support\Facades\Route;

// Health check
Route::get('/health', fn () => response()->json(['ok' => true, 'service' => 'stamply-api']));

// Apple Wallet PassKit web service. iOS Wallet builds these URLs from
// the `webServiceURL` we ship inside pass.json (which points at /api/),
// then appends `v1/...`. They MUST live at the API root — not under
// /public — because Apple's path is fixed.
Route::prefix('v1')
    ->where(['ptid' => 'pass\.[^/]+', 'serial' => '[^/]+', 'dev' => '[^/]+'])
    ->group(function () {
        Route::post('/devices/{dev}/registrations/{ptid}/{serial}', [ApplePassKitController::class, 'register']);
        Route::delete('/devices/{dev}/registrations/{ptid}/{serial}', [ApplePassKitController::class, 'unregister']);
        Route::get('/devices/{dev}/registrations/{ptid}', [ApplePassKitController::class, 'listUpdated']);
        Route::get('/passes/{ptid}/{serial}', [ApplePassKitController::class, 'getLatestPass']);
        Route::post('/log', [ApplePassKitController::class, 'log']);
    });

// Public — no auth. Used by end-customer signup + PWA card view.
Route::prefix('public')->group(function () {
    // Promotional banners for mobile app slider
    Route::get('/banners', [\App\Http\Controllers\Api\Op\BannerController::class, 'publicIndex']);

    Route::get('/cards/{template}', [PublicCardController::class, 'showTemplate']);
    Route::post('/cards/{template}/issue', [PublicCardController::class, 'issue']);
    Route::get('/issued/{serial}', [PublicCardController::class, 'showIssued']);
    Route::get('/issued/{serial}/push-config', [PublicPushTokenController::class, 'showConfig']);
    Route::post('/issued/{serial}/push-token', [PublicPushTokenController::class, 'store']);

    // Post-signup phone verification — used by the /i/{serial}
    // page to prove the customer actually owns the phone they
    // registered with. Opt-in (registration stays open), and once
    // verified the flag propagates to every customer row with the
    // same phone across all tenants. See PublicOtpController for
    // the full flow + rate limits.
    Route::post('/otp/request', [\App\Http\Controllers\Api\Public\PublicOtpController::class, 'request']);
    Route::post('/otp/verify', [\App\Http\Controllers\Api\Public\PublicOtpController::class, 'verify']);

    // Tenant brand logo — served as a real image so Google Wallet's
    // server-side image fetcher can load it (Google rejects data: URLs
    // in loyaltyClass programLogo.sourceUri.uri).
    Route::get('/tenant/{id}/logo', [\App\Http\Controllers\Api\Tenant\TenantController::class, 'publicLogo']);

    // Wallet (Phase 2)
    Route::get('/wallet/availability', [WalletController::class, 'availability']);
    Route::get('/wallet/apple/{serial}.pkpass', [WalletController::class, 'applePkPass']);
    Route::get('/wallet/google/{serial}', [WalletController::class, 'googleSaveUrl']);
});

/* ─────────────────────────────────────────────────────────────── */
/*  /app — Native mobile app (cross-tenant customer)                */
/* ─────────────────────────────────────────────────────────────── */
//
// Phone → OTP → Sanctum token with the `customer` ability. The token
// only works inside this route group; Sanctum's abilities middleware
// will reject it everywhere else with a 403. See docs/mobile-app-plan.md
// for the full flow.
Route::prefix('app')->group(function () {
    // Public auth endpoints
    Route::post('/auth/otp/request', [AppCustomerAuthController::class, 'request']);
    Route::post('/auth/otp/verify', [AppCustomerAuthController::class, 'verify']);

    // Authenticated customer endpoints
    Route::middleware(['auth:sanctum', 'abilities:customer'])->group(function () {
        Route::post('/auth/logout', [AppCustomerAuthController::class, 'logout']);

        Route::get('/me', [AppCustomerProfileController::class, 'show']);
        Route::put('/me', [AppCustomerProfileController::class, 'update']);

        Route::get('/cards', [AppCustomerCardsController::class, 'index']);
        Route::get('/cards/{serial}', [AppCustomerCardsController::class, 'show']);
        Route::get('/cards/{serial}/activity', [AppCustomerCardsController::class, 'activity']);
        Route::post('/cards/{serial}/wallet/apple', [AppCustomerCardsController::class, 'walletApple']);
        Route::post('/cards/{serial}/wallet/google', [AppCustomerCardsController::class, 'walletGoogle']);

        Route::get('/tenant/{tenantId}/cards', [AppCustomerCardsController::class, 'tenantCards']);

        // All tenants with at least one active card — for the "discover" screen
        Route::get('/discover/tenants', [AppCustomerCardsController::class, 'discoverTenants']);

        // Favorites
        Route::get('/favorites', [\App\Http\Controllers\Api\App\CustomerFavoritesController::class, 'index']);
        Route::post('/favorites/{tenantId}', [\App\Http\Controllers\Api\App\CustomerFavoritesController::class, 'store']);
        Route::delete('/favorites/{tenantId}', [\App\Http\Controllers\Api\App\CustomerFavoritesController::class, 'destroy']);
    });
});

// Authentication
Route::post('/login', [AuthController::class, 'login']);

// Self-serve merchant signup (public)
Route::post('/signup', [\App\Http\Controllers\Api\Public\SignupController::class, 'store']);

/* ─────────────────────────────────────────────────────────────── */
/*  /op — Platform (SaaS Operator) routes                           */
/* ─────────────────────────────────────────────────────────────── */

Route::prefix('op')->group(function () {
    Route::post('/login', [\App\Http\Controllers\Api\Op\AuthController::class, 'login']);

    // Authenticated with the 'op' Sanctum ability
    Route::middleware(['auth:sanctum', 'abilities:op'])->group(function () {
        Route::post('/logout', [\App\Http\Controllers\Api\Op\AuthController::class, 'logout']);
        Route::get('/me', [\App\Http\Controllers\Api\Op\AuthController::class, 'me']);

        Route::get('/dashboard/stats', [\App\Http\Controllers\Api\Op\DashboardController::class, 'stats']);

        // Self-service profile for the platform admin
        Route::get('/profile', [\App\Http\Controllers\Api\Op\ProfileController::class, 'show']);
        Route::put('/profile', [\App\Http\Controllers\Api\Op\ProfileController::class, 'update']);
        Route::put('/profile/password', [\App\Http\Controllers\Api\Op\ProfileController::class, 'updatePassword']);
        Route::post('/profile/logout-all', [\App\Http\Controllers\Api\Op\ProfileController::class, 'logoutAll']);

        // Platform-level settings (Stamply-owned credentials shared across tenants)
        Route::get('/settings/push', [\App\Http\Controllers\Api\Op\PlatformSettingsController::class, 'showPush']);
        Route::post('/settings/push/vapid/generate', [\App\Http\Controllers\Api\Op\PlatformSettingsController::class, 'generateVapid']);
        Route::post('/settings/push/vapid/regenerate', [\App\Http\Controllers\Api\Op\PlatformSettingsController::class, 'regenerateVapid']);
        Route::put('/settings/push/vapid', [\App\Http\Controllers\Api\Op\PlatformSettingsController::class, 'updateVapid']);
        Route::put('/settings/push/apns', [\App\Http\Controllers\Api\Op\PlatformSettingsController::class, 'updateApns']);
        Route::put('/settings/push/fcm', [\App\Http\Controllers\Api\Op\PlatformSettingsController::class, 'updateFcm']);
        // Wallet (Apple + Google) — shared across every tenant
        Route::get('/settings/wallet', [\App\Http\Controllers\Api\Op\PlatformSettingsController::class, 'showWallet']);
        Route::put('/settings/wallet/apple', [\App\Http\Controllers\Api\Op\PlatformSettingsController::class, 'updateAppleWallet']);
        Route::put('/settings/wallet/google', [\App\Http\Controllers\Api\Op\PlatformSettingsController::class, 'updateGoogleWallet']);
        // Platform feature flags (e.g. phone verification prompt)
        Route::get('/settings/features', [\App\Http\Controllers\Api\Op\PlatformSettingsController::class, 'showFeatures']);
        Route::put('/settings/features', [\App\Http\Controllers\Api\Op\PlatformSettingsController::class, 'updateFeatures']);

        Route::get('/tenants', [\App\Http\Controllers\Api\Op\TenantsController::class, 'index']);
        Route::post('/tenants', [\App\Http\Controllers\Api\Op\TenantsController::class, 'store']);
        Route::get('/tenants/{id}', [\App\Http\Controllers\Api\Op\TenantsController::class, 'show']);
        Route::patch('/tenants/{id}/toggle', [\App\Http\Controllers\Api\Op\TenantsController::class, 'toggle']);
        Route::delete('/tenants/{id}', [\App\Http\Controllers\Api\Op\TenantsController::class, 'destroy']);
        Route::post('/tenants/{id}/impersonate', [\App\Http\Controllers\Api\Op\TenantsController::class, 'impersonate']);

        // Cross-tenant customer profiles
        Route::get('/customers', [\App\Http\Controllers\Api\Op\CustomersController::class, 'index']);
        Route::get('/customers/{id}', [\App\Http\Controllers\Api\Op\CustomersController::class, 'show']);
        Route::get('/customers/{id}/cards', [\App\Http\Controllers\Api\Op\CustomersController::class, 'cards']);

        // Subscription management
        Route::get('/subscriptions', [\App\Http\Controllers\Api\Op\SubscriptionController::class, 'index']);
        Route::get('/subscriptions/{tenantId}', [\App\Http\Controllers\Api\Op\SubscriptionController::class, 'show']);
        Route::put('/subscriptions/{tenantId}', [\App\Http\Controllers\Api\Op\SubscriptionController::class, 'update']);
        Route::post('/subscriptions/{tenantId}/extend', [\App\Http\Controllers\Api\Op\SubscriptionController::class, 'extend']);
        Route::get('/subscriptions/{tenantId}/logs', [\App\Http\Controllers\Api\Op\SubscriptionController::class, 'logs']);
        Route::delete('/subscriptions/{tenantId}/logs/{logId}', [\App\Http\Controllers\Api\Op\SubscriptionController::class, 'deleteLog']);

        // Plans management
        Route::get('/plans', [\App\Http\Controllers\Api\Op\PlansController::class, 'index']);
        Route::put('/plans/{id}', [\App\Http\Controllers\Api\Op\PlansController::class, 'update']);

        // Banners (promotional images in mobile app slider)
        Route::get('/banners', [\App\Http\Controllers\Api\Op\BannerController::class, 'index']);
        Route::post('/banners', [\App\Http\Controllers\Api\Op\BannerController::class, 'store']);
        Route::post('/banners/{id}', [\App\Http\Controllers\Api\Op\BannerController::class, 'update']);
        Route::delete('/banners/{id}', [\App\Http\Controllers\Api\Op\BannerController::class, 'destroy']);
        Route::patch('/banners/{id}/toggle', [\App\Http\Controllers\Api\Op\BannerController::class, 'toggle']);

        // Customer profile unlock — clears locked_fields on a profile
        // so a customer can retry their signup flow from scratch.
        // Cross-tenant (profile is not scoped) — clearing locks
        // propagates everywhere the customer is enrolled.
        Route::post('/customers/unlock', [\App\Http\Controllers\Api\Op\CustomersController::class, 'unlock']);
    });
});

// Authenticated (merchant dashboard + cashier).
//
// `abilities:tenant` rejects op-scoped tokens with a clean 403 instead of
// letting them flow to the can.perm middleware which then crashes trying to
// call User::hasPermission() on a PlatformAdmin instance.
Route::middleware(['auth:sanctum', 'abilities:tenant'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Subscription info for the current tenant (read-only).
    // Outside the subscription middleware so tenants can always see their status.
    Route::get('/subscription', [\App\Http\Controllers\Api\Tenant\SubscriptionController::class, 'show']);

    // Self-service profile (intentionally NOT gated by can.perm — every
    // authenticated user is allowed to manage their own profile).
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/password', [ProfileController::class, 'updatePassword']);
    Route::post('/profile/logout-all', [ProfileController::class, 'logoutAll']);

    // Current tenant profile (brand info) — accessible even if expired
    Route::get('/tenant', [\App\Http\Controllers\Api\Tenant\TenantController::class, 'show']);
    Route::put('/tenant', [\App\Http\Controllers\Api\Tenant\TenantController::class, 'update']);

    // ══════════════════════════════════════════════════════════════
    // ── Subscription-gated routes ────────────────────────────────
    // ══════════════════════════════════════════════════════════════
    //
    // Middleware: `subscription` (CheckSubscription)
    //   • Active subscription → request proceeds normally
    //   • Expired subscription:
    //       – GET  requests → allowed (read-only browsing)
    //       – POST/PUT/PATCH/DELETE → blocked with 403
    //         {error: "subscription_expired", message: "..."}
    //
    // Middleware: `plan.quota:{resource}` (CheckPlanQuota)
    //   Applied on creation routes to enforce plan limits:
    //       – plan.quota:cards     → max_cards
    //       – plan.quota:locations → max_locations
    //       – plan.quota:users     → max_users
    //   Blocked with 403 {error: "plan_quota_exceeded", ...}
    //
    Route::middleware('subscription')->group(function () {

        // ── Dashboard ────────────────────────────────────────────
        Route::get('/dashboard/stats', [DashboardController::class, 'stats'])
            ->middleware('can.perm:dashboard.view');

        // ── Cards (quota: max_cards) ─────────────────────────────
        Route::get('/cards', [CardController::class, 'index'])->middleware('can.perm:cards.view');
        Route::get('/cards/{card}', [CardController::class, 'show'])->middleware('can.perm:cards.view');
        Route::post('/cards', [CardController::class, 'store'])->middleware(['can.perm:cards.manage', 'plan.quota:cards']);
        Route::put('/cards/{card}', [CardController::class, 'update'])->middleware('can.perm:cards.manage');
        Route::patch('/cards/{card}', [CardController::class, 'update'])->middleware('can.perm:cards.manage');
        Route::delete('/cards/{card}', [CardController::class, 'destroy'])->middleware('can.perm:cards.delete');
        Route::get('/cards/{card}/notifications', [CardController::class, 'getNotifications'])->middleware('can.perm:cards.view');
        Route::put('/cards/{card}/notifications', [CardController::class, 'updateNotifications'])->middleware('can.perm:cards.manage');

        // ── Customers ────────────────────────────────────────────
        Route::get('/customers', [CustomerController::class, 'index'])->middleware('can.perm:customers.view');
        Route::get('/customers/{customer}', [CustomerController::class, 'show'])->middleware('can.perm:customers.view');
        Route::get('/customers/{customer}/cards/{issued}/activity', [CustomerController::class, 'cardActivity'])->middleware('can.perm:customers.view');
        Route::post('/customers', [CustomerController::class, 'store'])->middleware('can.perm:customers.manage');
        Route::put('/customers/{customer}', [CustomerController::class, 'update'])->middleware('can.perm:customers.manage');
        Route::patch('/customers/{customer}', [CustomerController::class, 'update'])->middleware('can.perm:customers.manage');
        Route::delete('/customers/{customer}', [CustomerController::class, 'destroy'])->middleware('can.perm:customers.delete');

        // ── Locations (quota: max_locations) ─────────────────────
        Route::get('/locations', [LocationController::class, 'index'])->middleware('can.perm:locations.view');
        Route::get('/locations/{location}', [LocationController::class, 'show'])->middleware('can.perm:locations.view');
        Route::post('/locations', [LocationController::class, 'store'])->middleware(['can.perm:locations.manage', 'plan.quota:locations']);
        Route::put('/locations/{location}', [LocationController::class, 'update'])->middleware('can.perm:locations.manage');
        Route::patch('/locations/{location}', [LocationController::class, 'update'])->middleware('can.perm:locations.manage');
        Route::delete('/locations/{location}', [LocationController::class, 'destroy'])->middleware('can.perm:locations.manage');

        // ── Staff (quota: max_users) ─────────────────────────────
        Route::get('/staff', [StaffController::class, 'index'])->middleware('can.perm:staff.view');
        Route::get('/staff/{id}', [StaffController::class, 'show'])->middleware('can.perm:staff.view');
        Route::post('/staff', [StaffController::class, 'store'])->middleware(['can.perm:staff.manage', 'plan.quota:users']);
        Route::put('/staff/{id}', [StaffController::class, 'update'])->middleware('can.perm:staff.manage');
        Route::delete('/staff/{id}', [StaffController::class, 'destroy'])->middleware('can.perm:staff.manage');

        // ── Permissions ──────────────────────────────────────────
        Route::get('/permissions', [PermissionsController::class, 'index'])->middleware('can.perm:staff.permissions');
        Route::put('/permissions/{role}', [PermissionsController::class, 'update'])->middleware('can.perm:staff.permissions');

        // ── Messages (الرسائل) ───────────────────────────────────
        Route::middleware('can.perm:messages.send')->group(function () {
            Route::get('/messages', [MessageController::class, 'index']);
            Route::get('/messages/reach', [MessageController::class, 'reach']);
            Route::get('/messages/reach/{channel}', [MessageController::class, 'reachableCustomers']);
            Route::post('/messages', [MessageController::class, 'store']);
            Route::get('/messages/{id}', [MessageController::class, 'show']);
            Route::put('/messages/{id}', [MessageController::class, 'update']);
            Route::delete('/messages/{id}', [MessageController::class, 'destroy']);
            Route::post('/messages/{id}/send', [MessageController::class, 'send']);
        });

        // ── Automations (الأتمتة) ────────────────────────────────
        Route::get('/automations', [AutomationController::class, 'index'])->middleware('can.perm:automations.view');
        Route::get('/automations/presets', [AutomationController::class, 'presets'])->middleware('can.perm:automations.view');
        Route::get('/automations/{id}', [AutomationController::class, 'show'])->middleware('can.perm:automations.view');
        Route::get('/automations/{id}/runs', [AutomationController::class, 'runs'])->middleware('can.perm:automations.view');
        Route::post('/automations', [AutomationController::class, 'store'])->middleware('can.perm:automations.manage');
        Route::post('/automations/from-preset', [AutomationController::class, 'fromPreset'])->middleware('can.perm:automations.manage');
        Route::put('/automations/{id}', [AutomationController::class, 'update'])->middleware('can.perm:automations.manage');
        Route::patch('/automations/{id}/status', [AutomationController::class, 'updateStatus'])->middleware('can.perm:automations.manage');
        Route::post('/automations/{id}/test', [AutomationController::class, 'test'])->middleware('can.perm:automations.manage');
        Route::delete('/automations/{id}', [AutomationController::class, 'destroy'])->middleware('can.perm:automations.manage');

        // ── Reports ──────────────────────────────────────────────
        Route::get('/reports/summary', [ReportsController::class, 'summary'])->middleware('can.perm:reports.view');
        Route::get('/reports/stamps', [ReportsController::class, 'stamps'])->middleware('can.perm:reports.view');
        Route::get('/reports/redemptions', [ReportsController::class, 'redemptions'])->middleware('can.perm:reports.view');
        Route::get('/reports/issued-cards', [ReportsController::class, 'issuedCards'])->middleware('can.perm:cards.view');
        Route::get('/reports/customers.csv', [ReportsController::class, 'exportCustomers'])->middleware('can.perm:reports.export');
        Route::get('/reports/stamps.csv', [ReportsController::class, 'exportStamps'])->middleware('can.perm:reports.export');
        Route::get('/reports/redemptions.csv', [ReportsController::class, 'exportRedemptions'])->middleware('can.perm:reports.export');

        // ── Cashier (ماسح الكاشير) ───────────────────────────────
        Route::prefix('cashier')->group(function () {
            Route::get('/lookup/{serial}', [CashierController::class, 'lookup'])->middleware('can.perm:scan.use');
            Route::post('/stamps', [CashierController::class, 'giveStamp'])->middleware('can.perm:scan.give_stamp');
            Route::post('/stamps/remove', [CashierController::class, 'removeStamp'])->middleware('can.perm:scan.give_stamp');
            Route::post('/redemptions', [CashierController::class, 'redeem'])->middleware('can.perm:scan.redeem');
            Route::post('/cards/announce-all', [CashierController::class, 'announceAll'])->middleware('can.perm:messages.send');
            Route::post('/cards/{serial}/announce', [CashierController::class, 'announce'])->middleware('can.perm:messages.send');
        });

        // ── Integrations (البريد، الرسائل النصية، التنبيهات) ─────
        Route::prefix('integrations')->middleware('can.perm:settings.integrations')->group(function () {
            Route::get('/email', [IntegrationsController::class, 'showEmail']);
            Route::put('/email', [IntegrationsController::class, 'updateEmail']);
            Route::post('/email/test', [IntegrationsController::class, 'testEmail']);
            Route::get('/sms', [IntegrationsController::class, 'showSms']);
            Route::put('/sms', [IntegrationsController::class, 'updateSms']);
            Route::post('/sms/test', [IntegrationsController::class, 'testSms']);
            Route::get('/push', [IntegrationsController::class, 'showPush']);
            Route::put('/push', [IntegrationsController::class, 'updatePush']);
        });

        // ── Templates (قوالب البريد/الرسائل/التنبيهات) ───────────
        Route::middleware('can.perm:settings.templates')->group(function () {
            Route::get('/email-templates', [EmailTemplateController::class, 'index']);
            Route::get('/email-templates/{key}', [EmailTemplateController::class, 'show']);
            Route::put('/email-templates/{key}', [EmailTemplateController::class, 'update']);
            Route::post('/email-templates/{key}/reset', [EmailTemplateController::class, 'reset']);
            Route::post('/email-templates/{key}/test', [EmailTemplateController::class, 'test']);

            Route::get('/sms-templates', [\App\Http\Controllers\Api\Tenant\SmsTemplateController::class, 'index']);
            Route::get('/sms-templates/{key}', [\App\Http\Controllers\Api\Tenant\SmsTemplateController::class, 'show']);
            Route::put('/sms-templates/{key}', [\App\Http\Controllers\Api\Tenant\SmsTemplateController::class, 'update']);
            Route::post('/sms-templates/{key}/reset', [\App\Http\Controllers\Api\Tenant\SmsTemplateController::class, 'reset']);
            Route::post('/sms-templates/{key}/test', [\App\Http\Controllers\Api\Tenant\SmsTemplateController::class, 'test']);

            Route::get('/push-templates', [\App\Http\Controllers\Api\Tenant\PushTemplateController::class, 'index']);
            Route::get('/push-templates/{key}', [\App\Http\Controllers\Api\Tenant\PushTemplateController::class, 'show']);
            Route::put('/push-templates/{key}', [\App\Http\Controllers\Api\Tenant\PushTemplateController::class, 'update']);
            Route::post('/push-templates/{key}/reset', [\App\Http\Controllers\Api\Tenant\PushTemplateController::class, 'reset']);
            Route::post('/push-templates/{key}/test', [\App\Http\Controllers\Api\Tenant\PushTemplateController::class, 'test']);
        });

    }); // end subscription-gated group
});
