<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * SentNotification — audit row per logical push "send".
 *
 * See docblock on the migration
 * (database/migrations/*create_sent_notifications_table.php) for a
 * full description of semantics, statuses, and why recipients live in
 * a separate table.
 *
 * Common read patterns (covered by indexes on the migration):
 *   - /op notifications history page: list where tenant_id = … order by sent_at desc
 *   - customer timeline: list where customer_id = … order by sent_at desc
 *   - event dedup: exists where source = 'reward_ready' and issued_card_id = …
 */
class SentNotification extends Model
{
    use HasFactory;

    // Type constants — used by the /op UI for filtering and by services
    // when constructing a row so we don't repeat magic strings.
    public const TYPE_BROADCAST = 'broadcast';
    public const TYPE_TENANT_BROADCAST = 'tenant_broadcast';
    public const TYPE_EVENT = 'event';

    public const STATUS_PENDING = 'pending';
    public const STATUS_SENDING = 'sending';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'type',
        'source',
        'push_template_id',
        'tenant_id',
        'customer_id',
        'issued_card_id',
        'title',
        'body',
        'image_url',
        'data',
        'target_count',
        'sent_count',
        'failed_count',
        'status',
        'error_message',
        'sent_at',
    ];

    protected $casts = [
        'data' => 'array',
        'target_count' => 'integer',
        'sent_count' => 'integer',
        'failed_count' => 'integer',
        'sent_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function card(): BelongsTo
    {
        return $this->belongsTo(IssuedCard::class, 'issued_card_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(PushTemplate::class, 'push_template_id');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(SentNotificationRecipient::class);
    }
}
