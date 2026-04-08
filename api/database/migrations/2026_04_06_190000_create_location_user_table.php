<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pivot linking staff users to the branches they can operate at.
 *
 * A user with role=cashier is expected to have ≥ 1 row here (scoped scan).
 * A user with role=admin or manager may have 0 rows (global access).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('location_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('location_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'location_id']);
            // Both directions need an index — Postgres won't reuse the unique
            // for queries that filter on `location_id` alone. The unique itself
            // already covers the user_id direction (composite leading column).
            $table->index('location_id');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('location_user');
    }
};
