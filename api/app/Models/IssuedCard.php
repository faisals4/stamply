<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class IssuedCard extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'card_template_id',
        'serial_number',
        'stamps_count',
        'status',
        'installed_via',
        'apple_pass_serial',
        'apple_auth_token',
        'announcement_text',
        'announcement_updated_at',
        'google_object_id',
        'pass_updated_at',
        'issued_at',
        'installed_at',
        'last_used_at',
        'expires_at',
        'source_utm',
        'archived_by_customer_at',
    ];

    protected $casts = [
        'stamps_count' => 'integer',
        'archived_by_customer_at' => 'datetime',
        'pass_updated_at' => 'integer',
        'announcement_updated_at' => 'integer',
        'issued_at' => 'datetime',
        'installed_at' => 'datetime',
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (IssuedCard $card) {
            if (empty($card->serial_number)) {
                $card->serial_number = static::generateUniqueSerial();
            }
            if (empty($card->issued_at)) {
                $card->issued_at = now();
            }
        });
    }

    public static function generateUniqueSerial(): string
    {
        // Crockford-style alphabet (31 chars): no 0/O, 1/I/L confusion.
        // 6 chars × 31 alphabet = 31^6 ≈ 887 million possible serials,
        // enough for any single-tenant loyalty program while staying
        // short enough for customers to read aloud / type into a kiosk.
        $alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

        do {
            $serial = '';
            for ($i = 0; $i < 6; $i++) {
                $serial .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
        } while (static::withoutGlobalScopes()->where('serial_number', $serial)->exists());

        return $serial;
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(CardTemplate::class, 'card_template_id');
    }

    public function stamps(): HasMany
    {
        return $this->hasMany(Stamp::class);
    }

    public function redemptions(): HasMany
    {
        return $this->hasMany(Redemption::class);
    }

    public function applePassRegistrations(): HasMany
    {
        return $this->hasMany(ApplePassRegistration::class);
    }

    /**
     * Lazy-generate and persist the per-card authentication token Apple
     * Wallet sends back on every PassKit web service call. Called from
     * ApplePassBuilder when emitting pass.json and from WalletController
     * just before signing the .pkpass.
     */
    public function ensureAppleAuthToken(): string
    {
        if (! $this->apple_auth_token) {
            $this->apple_auth_token = bin2hex(random_bytes(32));
            $this->save();
        }

        return $this->apple_auth_token;
    }
}
