<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->string('role', 32)->default('admin')->after('password');

            // Composite index for staff list (StaffController::index orders by created_at within tenant)
            $table->index(['tenant_id', 'created_at']);
        });

        // CHECK constraint enforcing the role enum at the database layer.
        // Postgres-only — silently no-op on SQLite via the driver name guard.
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement(
                "ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','manager','cashier'))"
            );
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        }
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'created_at']);
            $table->dropConstrainedForeignId('tenant_id');
            $table->dropColumn('role');
        });
    }
};
