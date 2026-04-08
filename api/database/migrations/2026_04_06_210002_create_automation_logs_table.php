<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-step debug trail for an automation run. Cheap to write, easy to query
 * for the "what happened to this customer?" UI in the editor.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('automation_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('run_id')->constrained('automation_runs')->cascadeOnDelete();
            $table->unsignedInteger('step_index');
            $table->string('step_type', 32);
            $table->text('action');                          // human-readable description
            $table->string('result', 16);                    // 'success' | 'skipped' | 'failed'
            $table->text('error_message')->nullable();
            $table->timestamp('executed_at');

            $table->index(['run_id', 'executed_at']);
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement(
                "ALTER TABLE automation_logs ADD CONSTRAINT automation_logs_result_check CHECK (result IN ('success','skipped','failed'))"
            );
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement('ALTER TABLE automation_logs DROP CONSTRAINT IF EXISTS automation_logs_result_check');
        }
        Schema::dropIfExists('automation_logs');
    }
};
