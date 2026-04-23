<?php

namespace App\Console\Commands;

use App\Models\IssuedCard;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * One-shot maintenance command: rewrite every `issued_cards.serial_number`
 * with a freshly generated 6-character serial.
 *
 * Use case: the serial format shrank from 12 → 6 characters. Existing
 * cards still carry the old long serials; the product decision is to
 * move them all to the new short format and ask end users to reinstall
 * their Apple/Google Wallet passes.
 *
 * Safety:
 *   - Wrapped in a transaction so a mid-run failure rolls back cleanly.
 *   - Runs `IssuedCard::generateUniqueSerial()` per card, which guards
 *     against collisions against the live set AS IT SHRINKS — each new
 *     serial is checked against every other serial already persisted,
 *     including ones we just rewrote.
 *   - Bypasses the tenant global scope so operators running this from
 *     a Telescope/Horizon container without a tenant context still hit
 *     every tenant's cards.
 *
 * Re-running the command is harmless: it simply rotates serials again.
 */
class RegenerateCardSerials extends Command
{
    protected $signature = 'cards:regenerate-serials {--dry-run : Preview what would change without touching the DB}';

    protected $description = 'Rewrite every issued card serial with the new 6-char format';

    public function handle(): int
    {
        $cards = IssuedCard::withoutGlobalScopes()->get(['id', 'serial_number']);
        $total = $cards->count();

        if ($total === 0) {
            $this->info('No issued cards found. Nothing to do.');
            return self::SUCCESS;
        }

        $this->info("Found {$total} cards to regenerate.");

        if ($this->option('dry-run')) {
            foreach ($cards as $c) {
                $this->line("  #{$c->id}  {$c->serial_number}  →  (would regenerate)");
            }
            $this->warn('Dry-run — no changes written.');
            return self::SUCCESS;
        }

        $changed = 0;
        DB::transaction(function () use ($cards, &$changed) {
            foreach ($cards as $card) {
                $old = $card->serial_number;
                $new = IssuedCard::generateUniqueSerial();
                // Direct update bypasses model events so listeners that
                // fire on card updates don't get spammed for every row.
                IssuedCard::withoutGlobalScopes()
                    ->where('id', $card->id)
                    ->update(['serial_number' => $new]);
                $this->line("  #{$card->id}  {$old}  →  {$new}");
                $changed++;
            }
        });

        $this->info("Done. Regenerated {$changed} serials.");
        return self::SUCCESS;
    }
}
