<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Global platform configuration — one row, key-value style.
 *
 * Holds credentials that the SaaS operator (Stamply) owns on behalf of
 * ALL tenants: VAPID keys for Web Push, APNs cert for Apple Wallet + iOS
 * push, FCM service account for Android, Google Wallet issuer config,
 * etc.
 *
 * Tenants no longer need to generate their own — they inherit these by
 * default. Advanced enterprise tenants can still override per-tenant via
 * `tenant.settings.integrations.*`, and the resolver checks that first.
 *
 * Schema: one row per `key` with a JSON `value`. Keys we'll use:
 *   - push.vapid  → { public_key, private_key, subject }
 *   - push.apns   → { team_id, key_id, bundle_id, key_body }
 *   - push.fcm    → { project_id, service_account }
 *   - wallet.apple → { pass_type_id, cert, key, password }
 *   - wallet.google → { issuer_id, service_account }
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 64)->unique();
            $table->json('value');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_settings');
    }
};
