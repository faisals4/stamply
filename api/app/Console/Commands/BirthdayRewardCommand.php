<?php

namespace App\Console\Commands;

use App\Models\Customer;
use App\Models\IssuedCard;
use App\Models\Stamp;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Daily job: finds customers whose birthday is today and credits each of
 * their issued cards with the configured `birthdayStamps` from that card's
 * template settings.
 *
 * Runs via the Laravel scheduler; see routes/console.php.
 */
#[Signature('birthdays:reward {--dry-run : List who would be rewarded without writing anything}')]
#[Description('Grants birthday stamps to customers whose birthday is today')]
class BirthdayRewardCommand extends Command
{
    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');
        $today = now();

        // SQLite & PG both support strftime/extract, use date-based comparison
        $customers = Customer::withoutGlobalScopes()
            ->whereNotNull('birthdate')
            ->whereMonth('birthdate', $today->month)
            ->whereDay('birthdate', $today->day)
            ->with([
                'issuedCards.template:id,settings',
            ])
            ->get();

        if ($customers->isEmpty()) {
            $this->info('🎂 No birthdays today.');

            return self::SUCCESS;
        }

        $this->info("🎂 Found {$customers->count()} birthday(s) today.");

        $totalStampsGranted = 0;
        $totalCards = 0;

        foreach ($customers as $customer) {
            foreach ($customer->issuedCards as $card) {
                $settings = $card->template->settings ?? [];
                $birthdayStamps = (int) ($settings['birthdayStamps'] ?? 0);

                if ($birthdayStamps <= 0) {
                    continue;
                }

                $this->line(
                    "  → {$customer->full_name} (#{$customer->id}) on card {$card->serial_number}: +{$birthdayStamps}",
                );

                if ($dry) {
                    continue;
                }

                // Avoid double-crediting if the job runs twice on the same day
                $alreadyGiven = Stamp::withoutGlobalScopes()
                    ->where('issued_card_id', $card->id)
                    ->where('reason', 'birthday')
                    ->whereDate('created_at', $today->toDateString())
                    ->exists();

                if ($alreadyGiven) {
                    $this->line('    (already granted today — skipping)');

                    continue;
                }

                Stamp::withoutGlobalScopes()->create([
                    'tenant_id' => $card->tenant_id,
                    'issued_card_id' => $card->id,
                    'count' => $birthdayStamps,
                    'reason' => 'birthday',
                ]);

                IssuedCard::withoutGlobalScopes()
                    ->where('id', $card->id)
                    ->increment('stamps_count', $birthdayStamps);

                $totalStampsGranted += $birthdayStamps;
                $totalCards++;

                // TODO Phase 2: dispatch PushApplePassUpdate + PushGooglePassUpdate
                // jobs here so the customer sees the new stamps + a notification
                // on their wallet pass.
            }
        }

        if ($dry) {
            $this->warn('Dry run — nothing was written.');
        } else {
            $this->info("🎉 Granted {$totalStampsGranted} stamps across {$totalCards} card(s).");
        }

        return self::SUCCESS;
    }
}
