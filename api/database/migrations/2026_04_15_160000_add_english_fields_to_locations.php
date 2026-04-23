<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add optional English counterparts to the location name + address.
 *
 * Both are nullable: the Arabic name/address remain the primary
 * fields (used for business cards, merchant dashboards, the public
 * store directory). English values are shown only when the operator
 * fills them in — useful when the card template is rendered in
 * Apple/Google Wallet for an English-first device.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('locations', function (Blueprint $table) {
            $table->string('name_en')->nullable()->after('name');
            $table->string('address_en')->nullable()->after('address');
        });
    }

    public function down(): void
    {
        Schema::table('locations', function (Blueprint $table) {
            $table->dropColumn(['name_en', 'address_en']);
        });
    }
};
