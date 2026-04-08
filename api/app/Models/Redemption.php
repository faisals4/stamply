<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Redemption extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'issued_card_id',
        'card_reward_id',
        'used_by_user_id',
        'code',
        'status',
        'used_at',
        'expires_at',
    ];

    protected $casts = [
        'used_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Redemption $redemption) {
            if (empty($redemption->code)) {
                do {
                    $code = strtoupper(Str::random(8));
                } while (static::withoutGlobalScopes()->where('code', $code)->exists());
                $redemption->code = $code;
            }
        });
    }

    public function issuedCard(): BelongsTo
    {
        return $this->belongsTo(IssuedCard::class);
    }

    public function reward(): BelongsTo
    {
        return $this->belongsTo(CardReward::class, 'card_reward_id');
    }

    public function usedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'used_by_user_id');
    }
}
