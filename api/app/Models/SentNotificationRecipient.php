<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * SentNotificationRecipient — one row per device we tried to reach for
 * a given {@see SentNotification}.
 *
 * Written to by:
 *   - App\Services\Notifications\BroadcastNotifier (fan-out broadcasts)
 *   - App\Services\Notifications\CardNotificationDispatcher (events)
 *
 * Read by:
 *   - /op notifications detail page (show "delivered to X, failed on Y")
 *   - Customer-facing notification inbox (future)
 */
class SentNotificationRecipient extends Model
{
    use HasFactory;

    public const STATUS_QUEUED = 'queued';
    public const STATUS_SENT = 'sent';
    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'sent_notification_id',
        'customer_id',
        'push_token_id',
        'platform',
        'status',
        'error_message',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function notification(): BelongsTo
    {
        return $this->belongsTo(SentNotification::class, 'sent_notification_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function pushToken(): BelongsTo
    {
        return $this->belongsTo(PushToken::class);
    }
}
