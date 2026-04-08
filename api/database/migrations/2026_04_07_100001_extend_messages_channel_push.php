<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Add `push` as a valid channel on messages.channel. Requires dropping
 * and re-creating the CHECK constraint since Postgres doesn't allow
 * modifying it in place.
 */
return new class extends Migration {
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }
        \DB::statement('ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_channel_check');
        \DB::statement(
            "ALTER TABLE messages ADD CONSTRAINT messages_channel_check CHECK (channel IN ('email','sms','push'))"
        );
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }
        \DB::statement('ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_channel_check');
        \DB::statement(
            "ALTER TABLE messages ADD CONSTRAINT messages_channel_check CHECK (channel IN ('email','sms'))"
        );
    }
};
