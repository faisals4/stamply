<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stamps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('issued_card_id')->constrained()->cascadeOnDelete();
            $table->foreignId('given_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('count')->default(1); // support batch/refund (+/-)
            $table->string('reason', 32)->default('manual'); // manual|welcome|birthday|spend|product|visit|refund
            $table->timestamps();

            // (issued_card_id, created_at) — used by per-card history queries
            $table->index(['issued_card_id', 'created_at']);
            // (tenant_id, created_at) — THE most important index in the system.
            // Hit by every dashboard "stamps today / this week" query and every
            // report aggregation. Without this, every dashboard load is a full
            // sequential scan of the stamps table.
            $table->index(['tenant_id', 'created_at']);
            // (given_by_user_id, created_at) — for staff activity reports
            $table->index(['given_by_user_id', 'created_at']);
        });

        // Sanity CHECK: count cannot be zero (would be a no-op stamp). Negative
        // counts are allowed for refund/correction flows.
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement('ALTER TABLE stamps ADD CONSTRAINT stamps_count_nonzero CHECK (count <> 0)');
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement('ALTER TABLE stamps DROP CONSTRAINT IF EXISTS stamps_count_nonzero');
        }
        Schema::dropIfExists('stamps');
    }
};
