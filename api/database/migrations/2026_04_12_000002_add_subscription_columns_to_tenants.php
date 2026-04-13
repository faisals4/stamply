<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->timestamp('subscription_starts_at')->nullable()->after('trial_ends_at');
            $table->timestamp('subscription_ends_at')->nullable()->after('subscription_starts_at');
            $table->decimal('plan_price', 8, 2)->default(0)->after('subscription_ends_at');
            $table->string('plan_interval')->default('monthly')->after('plan_price'); // monthly, yearly
            $table->text('subscription_notes')->nullable()->after('plan_interval');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'subscription_starts_at',
                'subscription_ends_at',
                'plan_price',
                'plan_interval',
                'subscription_notes',
            ]);
        });
    }
};
