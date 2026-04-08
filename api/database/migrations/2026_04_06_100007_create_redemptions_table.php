<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('issued_card_id')->constrained()->cascadeOnDelete();
            // Reward catalog can be edited/deleted; we want redemption history
            // to survive even if the reward is removed. nullOnDelete preserves
            // it (the reward NAME is stored on the redemption history at use-time
            // anyway, so the link is informational).
            $table->foreignId('card_reward_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('used_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('code', 16)->unique(); // short claim code
            $table->string('status', 16)->default('pending'); // pending|used|expired|cancelled
            $table->timestamp('used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            // Existing
            $table->index(['issued_card_id', 'status']);
            // New: tenant + time index for reports
            $table->index(['tenant_id', 'created_at']);
            // New: reward usage analytics
            $table->index('card_reward_id');
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement(
                "ALTER TABLE redemptions ADD CONSTRAINT redemptions_status_check CHECK (status IN ('pending','used','expired','cancelled'))"
            );
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement('ALTER TABLE redemptions DROP CONSTRAINT IF EXISTS redemptions_status_check');
        }
        Schema::dropIfExists('redemptions');
    }
};
