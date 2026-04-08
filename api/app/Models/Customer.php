<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Customer extends Authenticatable so Sanctum can issue mobile-login
 * tokens via `$customer->createToken('mobile', ['customer'])`. The
 * `customer` ability isolates these tokens from every `/api/*` (tenant
 * admin) and `/api/op/*` (platform) route.
 *
 * WARNING: Customer uses `BelongsToTenant`, whose global scope filters
 * every query by `Auth::user()->tenant_id`. Once a customer token is
 * authenticated, that scope will limit cross-tenant lookups to the
 * single tenant the canonical Customer row happens to belong to — which
 * silently breaks the "all my cards in one place" promise of the mobile
 * app. Any code in Api\App\* controllers that reads Customer or
 * IssuedCard MUST call `::withoutGlobalScopes()` explicitly.
 */
class Customer extends Authenticatable
{
    use HasFactory, HasApiTokens, BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'phone',
        'phone_verified_at',
        'first_name',
        'last_name',
        'email',
        'birthdate',
        'locale',
        'source_utm',
        'last_activity_at',
    ];

    protected $casts = [
        'phone_verified_at' => 'datetime',
        'birthdate' => 'date',
        'last_activity_at' => 'datetime',
    ];

    public function isPhoneVerified(): bool
    {
        return $this->phone_verified_at !== null;
    }

    public function issuedCards(): HasMany
    {
        return $this->hasMany(IssuedCard::class);
    }

    public function pushTokens(): HasMany
    {
        return $this->hasMany(PushToken::class);
    }

    public function getFullNameAttribute(): string
    {
        return trim(($this->first_name ?? '').' '.($this->last_name ?? '')) ?: $this->phone;
    }
}
