<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CardReward extends Model
{
    use HasFactory;

    protected $fillable = [
        'card_template_id',
        'name',
        'stamps_required',
        'image_url',
    ];

    protected $casts = [
        'stamps_required' => 'integer',
    ];

    public function cardTemplate(): BelongsTo
    {
        return $this->belongsTo(CardTemplate::class);
    }
}
