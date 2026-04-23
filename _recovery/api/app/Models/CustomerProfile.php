<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Central customer profile — one row per real person, keyed by
 * phone number. Holds every personal field that should follow the
 * customer across every merchant they've signed up with:
 *
 *   - phone (unique), phone_verified_at
 *   - first_name, last_name, email, birthdate, gender
 *   - locked_fields  (array of field names the customer has "claimed"
 *                     and merchants can no longer edit)
 *
 * Per-merchant relationship data (locale, source_utm, last_activity_at)
 * stays on the tenant-scoped `customers` table which now acts as a
 * join table between profiles and tenants.
 *
 * # Authentication
 *
 * The mobile app issues Sanctum tokens against this model via
 * `$profile->createToken('mobile', ['customer'])`. `$request->user()`
 * inside the `/api/app/*` route group returns a `CustomerProfile`.
 *
 * # NOT tenant scoped
 *
 * We intentionally do NOT use the `BelongsToTenant` trait here. A
 * profile belongs to the person, not to a merchant. Any tenant-scoped
 * filtering happens via the `customers` relation in merchant-facing
 * controllers — e.g. `CustomerController::index` joins through
 * `customers` so merchants only see profiles they have a relationship
 * with.
 */
class CustomerProfile extends Authenticatable
{
    use HasFactory, HasApiTokens, SoftDeletes;

    protected $table = 'customer_profiles';

    protected $fillable = [
        'phone',
        'phone_verified_at',
        'first_name',
        'last_name',
        'email',
        'birthdate',
        'gender',
        'locked_fields',
    ];

    protected $casts = [
        'phone_verified_at' => 'datetime',
        'birthdate' => 'date',
        'locked_fields' => 'array',
    ];

    /**
     * All tenant relationships for this profile — one row per
     * merchant the customer has signed up with.
     */
    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    public function isPhoneVerified(): bool
    {
        return $this->phone_verified_at !== null;
    }

    /**
     * Whether a given field is currently locked from merchant edits.
     * Lock semantics: merchants cannot change the field via their
     * admin panel; only the customer themselves (via the mobile
     * app) or a platform admin (via /op) can modify it.
     */
    public function isFieldLocked(string $field): bool
    {
        return in_array($field, $this->locked_fields ?? [], true);
    }

    /**
     * Full-name accessor. Mirrors the old Customer::getFullNameAttribute
     * so existing serialization code that reads `$customer->full_name`
     * keeps working via the proxy accessor on Customer.
     */
    public function getFullNameAttribute(): string
    {
        return trim(($this->first_name ?? '').' '.($this->last_name ?? '')) ?: ($this->phone ?? '—');
    }
}
