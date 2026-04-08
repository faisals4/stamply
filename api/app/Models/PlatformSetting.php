<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Key-value row in `platform_settings`. NOT tenant-scoped — this is the
 * SaaS operator's own configuration, shared across all tenants.
 */
class PlatformSetting extends Model
{
    use HasFactory;

    protected $fillable = ['key', 'value'];

    protected $casts = [
        'value' => 'array',
    ];
}
