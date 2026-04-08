<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One device subscription (Web Push / APNs / FCM) belonging to a customer
 * inside a specific tenant. Created when the customer allows notifications
 * on their public card page; used later when a tenant broadcasts a
 * 'push'-channel message.
 */
class PushToken extends Model
{
    use HasFactory, BelongsToTenant;

    public const PLATFORMS = ['web', 'ios', 'android'];

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'platform',
        'token',
        'device_info',
        'last_seen_at',
    ];

    protected $casts = [
        'device_info' => 'array',
        'last_seen_at' => 'datetime',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
