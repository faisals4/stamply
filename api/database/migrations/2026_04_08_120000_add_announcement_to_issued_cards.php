<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-card "announcement" — a short text that appears in the back of
 * the Apple Wallet pass and triggers a lock-screen notification when
 * its value changes. The merchant uses this to broadcast offers,
 * holiday hours, etc. without needing a native iOS app + APNs setup.
 *
 * announcement_updated_at is a unix timestamp so we can compare it
 * cheaply against `pass_updated_at` and surface "new since last
 * download" indicators in the cashier UI later.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('issued_cards', function (Blueprint $table) {
            $table->string('announcement_text', 500)->nullable()->after('apple_auth_token');
            $table->unsignedBigInteger('announcement_updated_at')->default(0)->after('announcement_text');
        });
    }

    public function down(): void
    {
        Schema::table('issued_cards', function (Blueprint $table) {
            $table->dropColumn(['announcement_text', 'announcement_updated_at']);
        });
    }
};
