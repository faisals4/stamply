<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Customer — a tenant ↔ profile relationship row. Represents "this
 * real person is a customer of this specific merchant". The personal
 * information itself (name, phone, email, birthdate, gender,
 * verification state, locked fields) lives on the central
 * {@see \App\Models\CustomerProfile} which this row references via
 * `customer_profile_id`.
 *
 * Per-merchant relationship state stays here:
 *
 *   - locale            — the language the merchant should use when
 *                         messaging this customer (may differ across
 *                         merchants, e.g. Arabic at one, English at
 *                         another)
 *   - source_utm        — how this merchant acquired the customer
 *   - last_activity_at  — when the customer last interacted with
 *                         THIS merchant (stamps, redemptions, etc.)
 *
 * # Proxy accessors
 *
 * Existing code throughout the app still accesses personal fields
 * via `$customer->first_name`, `$customer->phone`, etc. Rather than
 * rewriting every call site, we provide proxy accessors that
 * transparently read from the underlying `profile` relation. Any
 * controller that returns Customer data MUST eager-load the
 * relation (`->with('profile')`) to avoid N+1 queries — in a dev
 * build Laravel's `Model::preventLazyLoading()` can be enabled to
 * surface missing eager loads as exceptions.
 *
 * ## Quick guide for callers
 *
 *   - `$customer->first_name`  → profile.first_name
 *   - `$customer->last_name`   → profile.last_name
 *   - `$customer->email`       → profile.email
 *   - `$customer->birthdate`   → profile.birthdate
 *   - `$customer->gender`      → profile.gender  (new)
 *   - `$customer->phone`       → profile.phone
 *   - `$customer->phone_verified_at` → profile.phone_verified_at
 *   - `$customer->full_name`   → profile.full_name
 *   - `$customer->locked_fields` → profile.locked_fields (new)
 *
 *   - `$customer->locale`, `$customer->source_utm`,
 *     `$customer->last_activity_at` stay on Customer itself.
 */
class Customer extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'customer_profile_id',
        'locale',
        'source_utm',
        'last_activity_at',
    ];

    protected $casts = [
        'last_activity_at' => 'datetime',
    ];

    /* ─── Relations ─────────────────────────────────────────── */

    public function profile(): BelongsTo
    {
        return $this->belongsTo(CustomerProfile::class, 'customer_profile_id');
    }

    public function issuedCards(): HasMany
    {
        return $this->hasMany(IssuedCard::class);
    }

    public function pushTokens(): HasMany
    {
        return $this->hasMany(PushToken::class);
    }

    /* ─── Proxy accessors (delegate to profile) ─────────────── */

    public function getFirstNameAttribute(): ?string
    {
        return $this->profile?->first_name;
    }

    public function getLastNameAttribute(): ?string
    {
        return $this->profile?->last_name;
    }

    public function getEmailAttribute(): ?string
    {
        return $this->profile?->email;
    }

    public function getBirthdateAttribute()
    {
        return $this->profile?->birthdate;
    }

    public function getGenderAttribute(): ?string
    {
        return $this->profile?->gender;
    }

    public function getPhoneAttribute(): ?string
    {
        return $this->profile?->phone;
    }

    public function getPhoneVerifiedAtAttribute()
    {
        return $this->profile?->phone_verified_at;
    }

    public function getLockedFieldsAttribute(): array
    {
        return $this->profile?->locked_fields ?? [];
    }

    public function getFullNameAttribute(): string
    {
        return $this->profile?->full_name ?? '—';
    }

    public function isPhoneVerified(): bool
    {
        return (bool) $this->profile?->isPhoneVerified();
    }

    public function isFieldLocked(string $field): bool
    {
        return (bool) $this->profile?->isFieldLocked($field);
    }
}
