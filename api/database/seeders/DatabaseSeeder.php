<?php

namespace Database\Seeders;

use App\Models\PlatformAdmin;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Idempotent seeder that recreates the minimum dev state needed for the SPA
 * to be usable after `migrate:fresh --seed`:
 *
 *   1. One tenant — `Stamply` (subdomain `stamply`).
 *   2. One tenant admin — `faisal@toot.im / Faisal@123`.
 *   3. One platform admin (for `/op/login`) — `op@stamply.dev / Op@123`.
 *
 * All other test data (cards, customers, stamps, broadcasts, locations) is
 * created on demand via the UI during testing.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::firstOrCreate(
            ['subdomain' => 'stamply'],
            [
                'name' => 'Stamply',
                'plan' => 'trial',
                'is_active' => true,
            ],
        );

        User::updateOrCreate(
            ['email' => 'faisal@toot.im'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Faisal',
                'password' => Hash::make('Faisal@123'),
                'role' => 'admin',
                'email_verified_at' => now(),
            ],
        );

        PlatformAdmin::updateOrCreate(
            ['email' => 'op@stamply.dev'],
            [
                'name' => 'Platform Admin',
                'password' => Hash::make('Op@123'),
                'role' => 'super_admin',
            ],
        );
    }
}
