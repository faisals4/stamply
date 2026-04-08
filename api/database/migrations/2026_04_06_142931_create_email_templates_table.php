<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('email_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            // Event key: welcome | birthday | winback | redemption | campaign
            $table->string('key', 32);
            $table->string('name'); // Human-readable label, editable
            $table->string('subject');
            $table->longText('html');
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();

            // One template per event per tenant
            $table->unique(['tenant_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_templates');
    }
};
