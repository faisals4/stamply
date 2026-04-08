<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use HasFactory, BelongsToTenant;

    public const CHANNELS = ['email', 'sms', 'push', 'wallet'];
    public const AUDIENCES = ['all', 'inactive'];
    public const STATUSES = ['draft', 'sending', 'sent', 'failed'];

    protected $fillable = [
        'tenant_id',
        'created_by',
        'channel',
        'subject',
        'body',
        'audience',
        'audience_meta',
        'status',
        'recipients_count',
        'sent_count',
        'failed_count',
        'sent_at',
        'failed_at',
    ];

    protected $casts = [
        'audience_meta' => 'array',
        'sent_at' => 'datetime',
        'failed_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
