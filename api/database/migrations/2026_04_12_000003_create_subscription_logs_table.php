<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('action');               // created, renewed, upgraded, downgraded, cancelled, extended, trial_started
            $table->string('plan_from')->nullable();
            $table->string('plan_to')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->decimal('amount', 8, 2)->default(0);
            $table->string('payment_method')->default('cash'); // cash, bank_transfer, card
            $table->text('notes')->nullable();
            $table->foreignId('performed_by')->nullable()->constrained('platform_admins');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_logs');
    }
};
