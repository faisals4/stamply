<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tenant marketing automations.
 *
 * Each row is one automation definition (name + trigger + steps). Real
 * executions are tracked per-customer in `automation_runs`.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('automations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();

            $table->string('name', 120);
            $table->text('description')->nullable();

            // 'draft' | 'active' | 'paused'
            $table->string('status', 16)->default('draft');

            // 'card_issued' | 'birthday' | 'inactive' (MVP)
            $table->string('trigger_type', 32);
            $table->json('trigger_config')->nullable(); // e.g. {"inactive_days": 30}

            // The flow definition: an array of step objects (see FlowEngine).
            $table->json('flow_json');

            $table->unsignedInteger('total_runs')->default(0);
            $table->timestamp('last_run_at')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->softDeletes();
            $table->timestamps();

            $table->index(['tenant_id', 'status', 'trigger_type']);
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement(
                "ALTER TABLE automations ADD CONSTRAINT automations_status_check CHECK (status IN ('draft','active','paused'))"
            );
            \DB::statement(
                "ALTER TABLE automations ADD CONSTRAINT automations_trigger_check CHECK (trigger_type IN ('card_issued','birthday','inactive','stamp_given'))"
            );
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement('ALTER TABLE automations DROP CONSTRAINT IF EXISTS automations_status_check');
            \DB::statement('ALTER TABLE automations DROP CONSTRAINT IF EXISTS automations_trigger_check');
        }
        Schema::dropIfExists('automations');
    }
};
