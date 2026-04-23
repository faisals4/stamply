<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('otp_sms_logs', function (Blueprint $table) {
            $table->string('country_code', 8)->nullable()->after('phone_masked');
            $table->string('device_type', 32)->nullable()->after('context');

            $table->index('country_code');
        });
    }

    public function down(): void
    {
        Schema::table('otp_sms_logs', function (Blueprint $table) {
            $table->dropIndex(['country_code']);
            $table->dropColumn(['country_code', 'device_type']);
        });
    }
};
