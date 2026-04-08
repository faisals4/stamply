<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-card secret used by the Apple Wallet PassKit web service.
 * iOS Wallet sends `Authorization: ApplePass <token>` on every callback,
 * and we authorize by matching this column. Generated lazily on first
 * pass download via IssuedCard::ensureAppleAuthToken().
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('issued_cards', function (Blueprint $table) {
            $table->string('apple_auth_token', 64)->nullable()->after('apple_pass_serial');
            $table->index('apple_auth_token');
        });
    }

    public function down(): void
    {
        Schema::table('issued_cards', function (Blueprint $table) {
            $table->dropIndex(['apple_auth_token']);
            $table->dropColumn('apple_auth_token');
        });
    }
};
