<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Location extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'address',
        'lat',
        'lng',
        'geofence_radius_m',
        'message',
        'is_active',
    ];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'geofence_radius_m' => 'integer',
        'is_active' => 'boolean',
    ];

    /** Staff members assigned to this branch. */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    /**
     * Card templates that include this branch in their geofence
     * notification list. The reverse side of `CardTemplate::locations()`.
     */
    public function cardTemplates(): BelongsToMany
    {
        return $this->belongsToMany(CardTemplate::class, 'card_template_location')
            ->withTimestamps();
    }
}
