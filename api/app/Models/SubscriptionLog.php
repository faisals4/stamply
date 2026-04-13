<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionLog extends Model
{
    protected $fillable = [
        'tenant_id',
        'action',
        'plan_from',
        'plan_to',
        'starts_at',
        'ends_at',
        'amount',
        'payment_method',
        'notes',
        'performed_by',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'amount' => 'decimal:2',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(PlatformAdmin::class, 'performed_by');
    }
}
