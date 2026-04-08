<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('phone', 32);
            $table->string('first_name', 80)->nullable();
            $table->string('last_name', 80)->nullable();
            $table->string('email', 180)->nullable();
            $table->date('birthdate')->nullable();
            $table->string('locale', 8)->default('ar');
            $table->string('source_utm', 180)->nullable();
            $table->timestamp('last_activity_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            // Phone is unique per tenant (not globally — same person can be in 2 tenants)
            $table->unique(['tenant_id', 'phone']);
            $table->index(['tenant_id', 'last_activity_at']);
            // Reports + dashboard query: "customers created in the last N days"
            $table->index(['tenant_id', 'created_at']);
            // Inactive-customer audience filter (MessageController::resolveAudience)
            $table->index('updated_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
