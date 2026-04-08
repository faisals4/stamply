<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * SaaS operator account. Completely isolated from tenants — no tenant_id,
 * no BelongsToTenant global scope, no access to tenant data by default.
 *
 * Uses a separate Sanctum ability (token name = 'op') so tenant-side
 * middleware can't accidentally accept a platform token, and vice versa.
 */
class PlatformAdmin extends Authenticatable
{
    use Notifiable, HasApiTokens;

    protected $table = 'platform_admins';

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'last_login_at' => 'datetime',
        ];
    }
}
