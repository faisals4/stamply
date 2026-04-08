<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-customer execution of an automation. One row per (automation × customer)
 * with a position cursor (current_step_index) so the FlowEngine can resume
 * after wait nodes.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('automation_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('automation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();

            // 'queued' → 'running' → ('waiting' → 'running')* → 'completed' | 'failed' | 'cancelled'
            $table->string('status', 16)->default('queued');

            $table->unsignedInteger('current_step_index')->default(0);

            // Set when status='waiting'. The tick command resumes runs whose
            // wait_until <= now().
            $table->timestamp('wait_until')->nullable();

            $table->json('context')->nullable(); // optional per-run scratch space

            $table->text('error_message')->nullable();

            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            // Hot path: tick command's "find resumable runs" query
            $table->index(['status', 'wait_until']);
            // Per-automation-per-customer dedup
            $table->index(['automation_id', 'customer_id']);
            $table->index(['tenant_id', 'status']);
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement(
                "ALTER TABLE automation_runs ADD CONSTRAINT automation_runs_status_check CHECK (status IN ('queued','running','waiting','completed','failed','cancelled'))"
            );
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement('ALTER TABLE automation_runs DROP CONSTRAINT IF EXISTS automation_runs_status_check');
        }
        Schema::dropIfExists('automation_runs');
    }
};
