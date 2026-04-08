<?php

namespace App\Models;

use Database\Factories\UserFactory;
use App\Services\PermissionCatalog;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'tenant_id', 'role'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, SoftDeletes;

    /** Allowed roles for tenant staff. */
    public const ROLES = ['admin', 'manager', 'cashier'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Branches this staff member can operate in (scan / give stamps).
     * Empty set = global (admin/manager default).
     */
    public function locations(): BelongsToMany
    {
        return $this->belongsToMany(Location::class);
    }

    /**
     * Resolved permission list for this user. Reads the tenant's stored
     * overrides (tenant.settings.role_permissions[role]) and falls back to
     * the catalog defaults for the user's role.
     */
    public function permissions(): array
    {
        $stored = $this->tenant?->settings['role_permissions'] ?? [];

        return $stored[$this->role] ?? PermissionCatalog::defaultsFor($this->role);
    }

    /**
     * Check whether this user is allowed to perform the given action.
     * Admins always bypass — they're the lock of last resort for the tenant.
     */
    public function hasPermission(string $permission): bool
    {
        if ($this->role === 'admin') {
            return true;
        }

        return in_array($permission, $this->permissions(), true);
    }
}
