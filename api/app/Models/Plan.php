<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $fillable = [
        'slug',
        'name_ar',
        'name_en',
        'monthly_price',
        'yearly_price',
        'max_cards',
        'max_locations',
        'max_users',
        'trial_days',
        'features',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'monthly_price' => 'decimal:2',
        'yearly_price' => 'decimal:2',
        'max_cards' => 'integer',
        'max_locations' => 'integer',
        'max_users' => 'integer',
        'trial_days' => 'integer',
        'features' => 'array',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
