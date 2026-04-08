<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tenant broadcast log. Each row is one campaign sent (or queued) by an
 * admin/manager to a slice of the tenant's customer base.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            // 'email' or 'sms' — the SaaS only supports these two for now.
            $table->string('channel', 10);

            $table->string('subject', 255)->nullable();   // email only
            $table->text('body');

            // 'all' = every customer; 'inactive' = customers with no stamps in N days.
            $table->string('audience', 20)->default('all');
            $table->json('audience_meta')->nullable();

            // 'draft' → 'sending' → 'sent' / 'failed'
            $table->string('status', 20)->default('draft');

            $table->unsignedInteger('recipients_count')->default(0);
            $table->unsignedInteger('sent_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);

            $table->timestamp('sent_at')->nullable();
            // Set when a synchronous send loop crashes mid-batch — used by the
            // resumer cron and by the UI to surface stuck campaigns.
            $table->timestamp('failed_at')->nullable();

            $table->timestamps();

            $table->index(['tenant_id', 'created_at']);
            $table->index(['tenant_id', 'status']);
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement(
                "ALTER TABLE messages ADD CONSTRAINT messages_channel_check CHECK (channel IN ('email','sms'))"
            );
            \DB::statement(
                "ALTER TABLE messages ADD CONSTRAINT messages_status_check CHECK (status IN ('draft','sending','sent','failed'))"
            );
            \DB::statement(
                "ALTER TABLE messages ADD CONSTRAINT messages_audience_check CHECK (audience IN ('all','inactive'))"
            );
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement('ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_channel_check');
            \DB::statement('ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check');
            \DB::statement('ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_audience_check');
        }
        Schema::dropIfExists('messages');
    }
};
