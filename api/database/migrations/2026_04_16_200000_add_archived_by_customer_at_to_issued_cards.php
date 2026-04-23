<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add a nullable `archived_by_customer_at` timestamp to `issued_cards`.
 *
 * When set, the card is hidden from the customer's home screen but
 * remains fully active — wallet passes, merchant dashboard, cashier
 * scanning, and public links are all unaffected. The column is read
 * and written exclusively by the customer-app endpoints in
 * CustomerCardsController; tenant/op controllers never touch it.
 *
 * NULL = visible on home screen (default for all existing cards)
 * timestamp = archived (hidden from home, shown in "Archived Cards")
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('issued_cards', function (Blueprint $table) {
            $table->timestamp('archived_by_customer_at')->nullable()->after('expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('issued_cards', function (Blueprint $table) {
            $table->dropColumn('archived_by_customer_at');
        });
    }
};
