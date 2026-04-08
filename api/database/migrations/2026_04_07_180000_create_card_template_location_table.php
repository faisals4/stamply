<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pivot linking card templates to the branches they're "available at" for
 * the purposes of geofence-based wallet notifications.
 *
 * Apple Wallet's `pass.json::locations` array (and its Google Wallet
 * equivalent) shows the pass on the user's lock screen when their phone
 * enters one of the listed locations. This pivot tells the pkpass
 * builder which `Location` rows to inject for each `CardTemplate`.
 *
 * A card may be linked to many locations (Apple caps at 10) and a
 * single location may host many cards.
 *
 * Pattern mirrors `2026_04_06_190000_create_location_user_table.php`.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('card_template_location', function (Blueprint $table) {
            $table->id();
            $table->foreignId('card_template_id')->constrained()->cascadeOnDelete();
            $table->foreignId('location_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['card_template_id', 'location_id'], 'ctpl_loc_unique');
            // Both directions need an index — Postgres won't reuse the unique
            // for queries that filter on `location_id` alone.
            $table->index('location_id');
            $table->index('card_template_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('card_template_location');
    }
};
