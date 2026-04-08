<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Stamp extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'issued_card_id',
        'given_by_user_id',
        'count',
        'reason',
    ];

    protected $casts = [
        'count' => 'integer',
    ];

    public function issuedCard(): BelongsTo
    {
        return $this->belongsTo(IssuedCard::class);
    }

    public function givenBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'given_by_user_id');
    }
}
