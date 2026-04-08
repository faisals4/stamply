<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-template notification configuration. Each card template carries
 * its own map of lifecycle triggers (welcome, almost_there, reward_ready,
 * etc.) with enable flags and bilingual messages. The backend fires
 * these automatically from the cashier flow so the merchant never has
 * to hand-dispatch a status update.
 *
 * Stored as a single JSON column instead of a join table because:
 *   - The trigger keys are a short, fixed enum (5-8 entries)
 *   - Editing always happens as a single atomic PUT from the editor
 *   - Lookups are O(1) once the template is loaded into memory
 *
 * Schema of the JSON:
 *   {
 *     "welcome":      { "enabled": true, "message_ar": "...", "message_en": "..." },
 *     "almost_there": { "enabled": true, "message_ar": "...", "message_en": "..." },
 *     "reward_ready": { "enabled": true, "message_ar": "...", "message_en": "..." },
 *     ...
 *   }
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('card_templates', function (Blueprint $table) {
            $table->json('notifications')->nullable()->after('design');
        });
    }

    public function down(): void
    {
        Schema::table('card_templates', function (Blueprint $table) {
            $table->dropColumn('notifications');
        });
    }
};
