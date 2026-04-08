<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per (device, issued_card) pair. Created when iOS Wallet calls
 * the PassKit register endpoint with its APNs push token. Used by
 * SendApplePassUpdate to fan out silent pushes whenever a card's stamps
 * change. Rows are deleted when APNs reports the token as 410 Gone.
 */
class ApplePassRegistration extends Model
{
    use HasFactory;

    protected $fillable = [
        'issued_card_id',
        'device_library_id',
        'push_token',
    ];

    public function issuedCard(): BelongsTo
    {
        return $this->belongsTo(IssuedCard::class);
    }
}
