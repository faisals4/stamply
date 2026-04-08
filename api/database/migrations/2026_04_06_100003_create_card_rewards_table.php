<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('card_rewards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('card_template_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->unsignedInteger('stamps_required');
            $table->string('image_url', 500)->nullable();
            $table->timestamps();

            // Foreign keys are not auto-indexed in Postgres. Add an explicit
            // index so loading rewards-by-template (CashierController, editor)
            // doesn't sequentially scan.
            $table->index('card_template_id');
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement(
                'ALTER TABLE card_rewards ADD CONSTRAINT card_rewards_stamps_required_positive CHECK (stamps_required > 0)'
            );
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement('ALTER TABLE card_rewards DROP CONSTRAINT IF EXISTS card_rewards_stamps_required_positive');
        }
        Schema::dropIfExists('card_rewards');
    }
};
