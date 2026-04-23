<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds `customer_profile_id` to push_tokens so the native mobile app
 * can register a single FCM token against the cross-tenant profile
 * rather than duplicating the token row for every tenant the same
 * physical person is enrolled with.
 *
 * Why nullable? Existing web tokens registered by the PWA are scoped
 * to (tenant_id, customer_id) only — they predate profiles and don't
 * need this column. Leaving it null preserves the old behaviour.
 *
 * Lookup strategy after this migration (see CardNotificationDispatcher):
 *
 *   SELECT * FROM push_tokens
 *   WHERE customer_id = :tenant_scoped_customer_id
 *      OR customer_profile_id = :profile_id
 *
 * This finds both the tenant-scoped PWA token AND any cross-tenant
 * mobile tokens belonging to the same real person.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('push_tokens', function (Blueprint $table) {
            $table->foreignId('customer_profile_id')->nullable()
                ->after('customer_id')
                ->constrained()->nullOnDelete();

            // Fast lookup for broadcasts & profile-wide targeting.
            $table->index('customer_profile_id');
        });
    }

    public function down(): void
    {
        Schema::table('push_tokens', function (Blueprint $table) {
            $table->dropConstrainedForeignId('customer_profile_id');
        });
    }
};
