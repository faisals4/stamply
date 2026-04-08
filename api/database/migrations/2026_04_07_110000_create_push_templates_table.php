<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Push notification templates — mirrors email_templates / sms_templates.
 *
 * Each template has BOTH a title and a body because system notifications
 * are rendered as title + body on the lock screen. Title is short (~40
 * chars on iOS, a bit more on Android), body wraps.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('push_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('key', 32);
            $table->string('name');
            $table->string('title'); // notification title (short)
            $table->text('body');    // notification body (wraps)
            $table->string('url')->nullable(); // deep link (click target)
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_templates');
    }
};
