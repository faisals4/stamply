<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Device tokens for push notifications. Each customer can have multiple
 * tokens (phone, tablet, laptop — each a separate browser/app install).
 *
 * Tokens are tenant-scoped: the same physical device registering under
 * two different merchants produces two rows (different issued cards, so
 * two separate subscriptions).
 *
 * `platform` = 'web' | 'ios' | 'android' — so we can route to the right
 * sending service later (Web Push / APNs / FCM). For the initial stub
 * implementation every row is 'web' since Web Push is the only channel
 * that works without Apple/Google credentials.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('push_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->string('platform', 16); // web | ios | android
            $table->text('token'); // long for Web Push endpoint URLs
            // Arbitrary JSON about the device — userAgent, OS, model, IP, etc.
            // Stored for admin diagnostics and so the push log can show which
            // device failed/succeeded.
            $table->json('device_info')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();

            // Primary lookup for sending: "all tokens for this customer".
            $table->index(['tenant_id', 'customer_id']);
            // For cleanup jobs.
            $table->index('last_seen_at');
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            // Platform must be one of the supported values.
            \DB::statement(
                "ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_platform_check CHECK (platform IN ('web','ios','android'))"
            );
            // Same token can't be registered twice under the same tenant —
            // when the device re-registers we UPDATE the existing row.
            \DB::statement(
                'CREATE UNIQUE INDEX push_tokens_tenant_token_uniq ON push_tokens (tenant_id, md5(token))'
            );
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement('ALTER TABLE push_tokens DROP CONSTRAINT IF EXISTS push_tokens_platform_check');
            \DB::statement('DROP INDEX IF EXISTS push_tokens_tenant_token_uniq');
        }
        Schema::dropIfExists('push_tokens');
    }
};
