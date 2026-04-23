<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * sent_notifications
 * ==================
 *
 * Audit log for every push notification we dispatch.
 *
 * One row per logical "send" (whether it fans out to one device or one
 * million). Per-device delivery detail lives in the sibling table
 * `sent_notification_recipients` created in the next migration.
 *
 * Scope:
 *   - broadcast:  platform-wide announcement authored in /op, target = "all"
 *   - tenant_broadcast: tenant-wide announcement (all customers of one tenant)
 *   - event:      automated lifecycle push (stamp_added, reward_ready, …)
 *
 * Why a dedicated table instead of piggy-backing on `push_tokens`?
 *   - History: you need to answer "what did we send and to whom" months
 *     after the fact; push_tokens is a live registry, not a log.
 *   - Analytics: the /op dashboard reports on total sends, delivery rate,
 *     failure reasons — that needs denormalised counters (target / sent /
 *     failed) that stay stable even if tokens later churn.
 *   - Idempotency: `source_ref` lets us deduplicate auto-notifications
 *     (e.g. don't send reward_ready twice for the same card within N min).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sent_notifications', function (Blueprint $table) {
            $table->id();

            // Classification ---------------------------------------------
            // 'broadcast'         → platform-wide announcement (all users)
            // 'tenant_broadcast'  → all customers of one tenant
            // 'event'             → automated per-card trigger (stamp/reward)
            $table->string('type', 32);

            // Origin of the send. For broadcasts: the op admin user id
            // (prefixed 'user:123'). For events: the trigger key
            // ('stamp_added', 'reward_ready', 'almost_there', 'halfway').
            $table->string('source', 64);

            // Optional link to push_templates row when the copy came from
            // a named template (broadcasts often don't use templates and
            // leave this null).
            $table->foreignId('push_template_id')->nullable()
                ->constrained()->nullOnDelete();

            // Scope -------------------------------------------------------
            // tenant_id is null for platform-wide broadcasts.
            // customer_id is set only for direct-to-customer sends.
            $table->foreignId('tenant_id')->nullable()
                ->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()
                ->constrained()->cascadeOnDelete();

            // When an event fired off a specific card, keep the pointer
            // so the history UI can link back to the card detail page.
            $table->foreignId('issued_card_id')->nullable()
                ->constrained()->nullOnDelete();

            // Message body ------------------------------------------------
            $table->string('title', 255);
            $table->text('body');
            $table->string('image_url', 2048)->nullable();

            // Extra payload delivered as FCM `data` (deep link, card_serial,
            // tracking ids, etc.). Stored verbatim so the history UI can
            // show exactly what the device received.
            $table->json('data')->nullable();

            // Delivery counters — updated as recipients resolve. Kept
            // on the parent row so the index page doesn't have to
            // aggregate the recipients table on every request.
            $table->unsignedInteger('target_count')->default(0);
            $table->unsignedInteger('sent_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);

            // Lifecycle ---------------------------------------------------
            // pending    → created, not yet dispatched to transport
            // sending    → queued / partially delivered
            // completed  → all recipients resolved
            // failed     → top-level failure before any recipients were tried
            $table->string('status', 16)->default('pending');
            $table->text('error_message')->nullable();

            // When the transport actually started / finished sending.
            // sent_at is used by the history UI as the primary timestamp.
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            // Indexes -----------------------------------------------------
            // The history page filters by tenant + date; a compound index
            // covers the common case without forcing a scan on a huge
            // multi-tenant table.
            $table->index(['tenant_id', 'sent_at']);
            $table->index(['type', 'sent_at']);
            $table->index(['customer_id', 'sent_at']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sent_notifications');
    }
};
