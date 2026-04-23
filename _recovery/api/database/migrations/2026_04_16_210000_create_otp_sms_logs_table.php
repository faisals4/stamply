<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('otp_sms_logs', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 32);
            $table->string('phone_masked', 32);
            $table->string('context', 32)->default('mobile_login');
            $table->string('provider', 32);
            $table->string('status', 20)->default('sent');
            $table->string('verification_id', 64)->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index('created_at');
            $table->index('provider');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('otp_sms_logs');
    }
};
