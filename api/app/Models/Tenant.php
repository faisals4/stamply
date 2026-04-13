<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'subdomain',
        'plan',
        'trial_ends_at',
        'is_active',
        'settings',
        'subscription_starts_at',
        'subscription_ends_at',
        'plan_price',
        'plan_interval',
        'subscription_notes',
    ];

    protected $casts = [
        'trial_ends_at' => 'datetime',
        'subscription_starts_at' => 'datetime',
        'subscription_ends_at' => 'datetime',
        'plan_price' => 'decimal:2',
        'is_active' => 'boolean',
        'settings' => 'array',
    ];

    /* ─── Relationships ───────────────────────────────────────────── */

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function cardTemplates(): HasMany
    {
        return $this->hasMany(CardTemplate::class);
    }

    public function subscriptionLogs(): HasMany
    {
        return $this->hasMany(SubscriptionLog::class);
    }

    /* ─── Subscription helpers ────────────────────────────────────── */

    /**
     * Is the tenant on the free trial plan?
     */
    public function isTrial(): bool
    {
        return $this->plan === 'trial';
    }

    /**
     * Is the subscription (or trial) still active?
     * Includes a 1-day grace period after expiry.
     */
    public function isSubscriptionActive(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        $gracePeriod = now()->subDay(); // 1 day grace

        if ($this->isTrial()) {
            return $this->trial_ends_at && $this->trial_ends_at->gt($gracePeriod);
        }

        return $this->subscription_ends_at && $this->subscription_ends_at->gt($gracePeriod);
    }

    /**
     * The effective expiry date (trial_ends_at or subscription_ends_at).
     */
    public function expiresAt(): ?\Carbon\Carbon
    {
        return $this->isTrial() ? $this->trial_ends_at : $this->subscription_ends_at;
    }

    /**
     * Days remaining until subscription expires.
     */
    public function daysRemaining(): int
    {
        $expires = $this->expiresAt();
        if (! $expires) {
            return 0;
        }

        return max(0, (int) now()->startOfDay()->diffInDays($expires->startOfDay(), false));
    }

    /**
     * Get the subscription status label.
     */
    public function subscriptionStatus(): string
    {
        if (! $this->is_active) {
            return 'disabled';
        }

        if (! $this->isSubscriptionActive()) {
            return 'expired';
        }

        if ($this->isTrial()) {
            return 'trial';
        }

        if ($this->daysRemaining() <= 7) {
            return 'expiring_soon';
        }

        return 'active';
    }

    /**
     * Resolve the Plan model for this tenant's current plan slug.
     */
    public function planModel(): ?Plan
    {
        return Plan::where('slug', $this->plan)->first();
    }
}
