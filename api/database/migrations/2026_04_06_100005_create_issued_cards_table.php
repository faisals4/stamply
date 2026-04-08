<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('issued_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            // Card template is the LOGICAL parent — but if a tenant deletes a
            // template we want to PRESERVE the historical issued cards (and
            // their stamps + redemptions), not nuke them. So nullOnDelete.
            $table->foreignId('card_template_id')->nullable()->constrained()->nullOnDelete();
            $table->string('serial_number', 64)->unique(); // public short URL slug
            $table->unsignedInteger('stamps_count')->default(0);
            $table->string('status', 16)->default('active'); // active|installed|inactive|expired
            $table->timestamp('issued_at')->useCurrent();
            $table->timestamp('installed_at')->nullable(); // when added to Wallet
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            // Existing indexes
            $table->index(['tenant_id', 'status']);
            $table->index(['customer_id']);
            // New: card_template_id lookups for reports + admin filtering
            $table->index('card_template_id');
            // New: one issued card per (customer, template) — prevents duplicates.
            // The PublicCardController already does an existence check; this is
            // the database-level guarantee.
            $table->unique(['customer_id', 'card_template_id'], 'issued_cards_customer_template_unique');
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement(
                "ALTER TABLE issued_cards ADD CONSTRAINT issued_cards_status_check CHECK (status IN ('active','installed','inactive','expired'))"
            );
            // stamps_count is unsignedInteger but Postgres has no unsigned types;
            // an explicit CHECK is the equivalent guarantee.
            \DB::statement(
                'ALTER TABLE issued_cards ADD CONSTRAINT issued_cards_stamps_nonneg CHECK (stamps_count >= 0)'
            );
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement('ALTER TABLE issued_cards DROP CONSTRAINT IF EXISTS issued_cards_status_check');
            \DB::statement('ALTER TABLE issued_cards DROP CONSTRAINT IF EXISTS issued_cards_stamps_nonneg');
        }
        Schema::dropIfExists('issued_cards');
    }
};
