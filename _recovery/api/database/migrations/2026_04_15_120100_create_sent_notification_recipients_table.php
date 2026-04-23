<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * sent_notification_recipients
 * ============================
 *
 * Per-device delivery detail for each row in `sent_notifications`.
 *
 * Why separate?
 *   A single /op broadcast can fan out to tens of thousands of push
 *   tokens. Keeping that detail here means:
 *     - The parent sent_notifications row stays a single compact record
 *       that the history page can list cheaply.
 *     - Per-device failure reasons (e.g. "token not registered") are
 *       preserved for debugging without bloating the parent row's JSON.
 *     - We can cascade-delete when a customer is removed without
 *       orphaning rows.
 *
 * Stored fields:
 *   - push_token_id: nullable because the token row may have been
 *     deleted by FcmTransport (NotFound → delete) between the attempt
 *     and a retroactive audit query.
 *   - status: 'queued' | 'sent' | 'failed'
 *   - error_message: free-text reason for 'failed' rows
 *   - sent_at: transport call completion time (success OR failure)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sent_notification_recipients', function (Blueprint $table) {
            $table->id();

            $table->foreignId('sent_notification_id')
                ->constrained()->cascadeOnDelete();

            // Customer who owned the token at send time. Useful for
            // querying "all notifications received by user X" even after
            // their tokens have rotated.
            $table->foreignId('customer_id')->nullable()
                ->constrained()->nullOnDelete();

            // Pointer to the live push_tokens row. May become null if
            // the token was deleted (e.g. uninstalled, NotFound from FCM).
            $table->foreignId('push_token_id')->nullable()
                ->constrained()->nullOnDelete();

            // Platform at send time. Denormalised so we can report on
            // iOS-vs-Android delivery even after the token is gone.
            $table->string('platform', 16)->nullable();

            $table->string('status', 16)->default('queued');
            $table->text('error_message')->nullable();

            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            // The history detail page is the main consumer — list all
            // recipients of a given notification, newest first. Composite
            // index makes that O(log n) regardless of total row count.
            $table->index(['sent_notification_id', 'status']);
            $table->index(['customer_id', 'sent_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sent_notification_recipients');
    }
};
