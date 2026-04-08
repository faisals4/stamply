<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('card_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->text('description')->nullable();
            $table->string('type', 16)->default('stamp'); // stamp|points|membership|discount|cashback|coupon|multipass|gift
            $table->string('status', 16)->default('draft'); // draft|active|inactive
            // Postgres will store these as JSONB (Laravel maps json -> jsonb on
            // pgsql), giving us indexable, binary-encoded JSON for free.
            $table->json('design'); // colors, stamps_count, icon, logo_url, etc.
            $table->json('settings'); // barcode_type, reward_program, expirations, etc.
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement(
                "ALTER TABLE card_templates ADD CONSTRAINT card_templates_type_check CHECK (type IN ('stamp','points','membership','discount','cashback','coupon','multipass','gift'))"
            );
            \DB::statement(
                "ALTER TABLE card_templates ADD CONSTRAINT card_templates_status_check CHECK (status IN ('draft','active','inactive'))"
            );
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            \DB::statement('ALTER TABLE card_templates DROP CONSTRAINT IF EXISTS card_templates_type_check');
            \DB::statement('ALTER TABLE card_templates DROP CONSTRAINT IF EXISTS card_templates_status_check');
        }
        Schema::dropIfExists('card_templates');
    }
};
