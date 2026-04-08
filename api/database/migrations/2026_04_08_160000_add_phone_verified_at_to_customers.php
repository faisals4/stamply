<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-customer "phone verified" flag, used by the post-signup OTP
 * flow on /i/{serial}. Null means "phone not yet proven to belong
 * to this customer" (the current default — any visitor can enter
 * any phone). A timestamp means the customer successfully proved
 * ownership via a 4-digit SMS code.
 *
 * Verification is cross-tenant: when a customer verifies their
 * phone at merchant A, every customer row with the same phone
 * (across all tenants) gets the same timestamp. Phone ownership
 * is a real-world fact, not a per-tenant concept, and customers
 * would resent having to re-verify at each merchant.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->timestamp('phone_verified_at')->nullable()->after('phone');
            // Index so admin filters "verified customers only" stay
            // fast even at millions of rows.
            $table->index('phone_verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex(['phone_verified_at']);
            $table->dropColumn('phone_verified_at');
        });
    }
};
