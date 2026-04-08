<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Platform (SaaS operator) admin accounts — completely separate from the
 * tenant `users` table. These are the humans who run Stamply itself,
 * NOT merchants.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('platform_admins', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('email', 180)->unique();
            $table->string('password');
            $table->string('role', 32)->default('super_admin'); // super_admin | support | read_only
            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement(
                "ALTER TABLE platform_admins ADD CONSTRAINT platform_admins_role_check CHECK (role IN ('super_admin','support','read_only'))"
            );
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement('ALTER TABLE platform_admins DROP CONSTRAINT IF EXISTS platform_admins_role_check');
        }
        Schema::dropIfExists('platform_admins');
    }
};
