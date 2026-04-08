<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('issued_cards', function (Blueprint $table) {
            $table->string('installed_via', 16)->nullable()->after('status');
            $table->string('apple_pass_serial', 64)->nullable()->unique()->after('installed_via');
            $table->string('google_object_id', 255)->nullable()->after('apple_pass_serial');
            $table->unsignedBigInteger('pass_updated_at')->default(0)->after('google_object_id');
        });

        Schema::create('apple_pass_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('issued_card_id')->constrained()->cascadeOnDelete();
            $table->string('device_library_id', 64);
            $table->string('push_token', 255);
            $table->timestamps();

            $table->unique(['device_library_id', 'issued_card_id'], 'apple_reg_unique');
            $table->index('issued_card_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apple_pass_registrations');
        Schema::table('issued_cards', function (Blueprint $table) {
            $table->dropColumn([
                'installed_via',
                'apple_pass_serial',
                'google_object_id',
                'pass_updated_at',
            ]);
        });
    }
};
