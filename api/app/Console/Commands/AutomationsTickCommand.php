<?php

namespace App\Console\Commands;

use App\Models\Automation;
use App\Models\AutomationRun;
use App\Models\Customer;
use App\Services\Automation\FlowEngine;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Heartbeat for the automation system. Runs every minute via the scheduler.
 *
 * Two responsibilities:
 *   1. RESUME — pick up `automation_runs` whose status='waiting' and
 *      wait_until <= now(), and feed them back into the FlowEngine.
 *   2. TIME-BASED TRIGGERS — start fresh runs for active automations whose
 *      trigger_type is `birthday` or `inactive` and whose customers match
 *      today's window. Dedup ensures each customer only gets one run per day
 *      per automation.
 *
 * Synchronous, no queue worker required.
 */
#[Signature('automations:tick {--dry-run : Print what would happen without writing anything}')]
#[Description('Heartbeat: resume waiting automation runs + start time-based triggers')]
class AutomationsTickCommand extends Command
{
    public function handle(FlowEngine $engine): int
    {
        $dry = (bool) $this->option('dry-run');

        $resumed = $this->resumeWaitingRuns($engine, $dry);
        $started = $this->startTimeBasedRuns($engine, $dry);

        $this->info("automations:tick → resumed {$resumed}, started {$started}");
        return self::SUCCESS;
    }

    /** Resume any waiting runs whose timer has elapsed. */
    private function resumeWaitingRuns(FlowEngine $engine, bool $dry): int
    {
        $count = 0;
        // withoutGlobalScopes() is critical here — the BelongsToTenant trait
        // requires an authenticated user, which console commands don't have.
        //
        // We compare against DB-side NOW() (via whereRaw) instead of Laravel's
        // now() helper, so there's no timezone drift between the app layer
        // (UTC) and the stored timestamps (already in DB timezone).
        AutomationRun::withoutGlobalScopes()
            ->where('status', 'waiting')
            ->whereRaw('wait_until <= NOW()')
            ->orderBy('id')
            ->get()
            ->each(function ($run) use ($engine, $dry, &$count) {
                $count++;
                if ($dry) {
                    $this->line("  would resume run #{$run->id} (automation #{$run->automation_id})");
                    return;
                }
                $engine->run($run);
            });
        return $count;
    }

    /** Start runs for active birthday/inactive automations. */
    private function startTimeBasedRuns(FlowEngine $engine, bool $dry): int
    {
        $count = 0;
        $automations = Automation::query()
            ->withoutGlobalScopes()
            ->where('status', 'active')
            ->whereIn('trigger_type', ['birthday', 'inactive'])
            ->get();

        foreach ($automations as $auto) {
            $customers = $this->resolveAudience($auto);
            foreach ($customers as $customer) {
                if ($this->alreadyRunToday($auto, $customer)) continue;

                $count++;
                if ($dry) {
                    $this->line("  would start run for automation #{$auto->id} customer #{$customer->id}");
                    continue;
                }

                $run = AutomationRun::create([
                    'tenant_id' => $auto->tenant_id,
                    'automation_id' => $auto->id,
                    'customer_id' => $customer->id,
                    'status' => 'queued',
                    'current_step_index' => 0,
                    'started_at' => now(),
                ]);

                $engine->run($run);
            }
        }

        return $count;
    }

    private function resolveAudience(Automation $auto)
    {
        if ($auto->trigger_type === 'birthday') {
            // birthdate moved to customer_profiles in the central-profile
            // refactor — pivot through the profile relation so the filter
            // uses the new column home.
            return Customer::withoutGlobalScopes()
                ->where('tenant_id', $auto->tenant_id)
                ->whereHas('profile', fn ($q) => $q
                    ->whereNotNull('birthdate')
                    ->whereMonth('birthdate', now()->month)
                    ->whereDay('birthdate', now()->day)
                )
                ->whereNull('deleted_at')
                ->get();
        }
        if ($auto->trigger_type === 'inactive') {
            $days = (int) ($auto->trigger_config['inactive_days'] ?? 30);
            return Customer::withoutGlobalScopes()
                ->where('tenant_id', $auto->tenant_id)
                ->whereNull('deleted_at')
                ->where(function ($q) use ($days) {
                    $q->where('last_activity_at', '<=', now()->subDays($days))
                        ->orWhereNull('last_activity_at');
                })
                ->get();
        }
        return collect();
    }

    private function alreadyRunToday(Automation $auto, Customer $customer): bool
    {
        return AutomationRun::query()
            ->withoutGlobalScopes()
            ->where('automation_id', $auto->id)
            ->where('customer_id', $customer->id)
            ->whereDate('started_at', now()->toDateString())
            ->exists();
    }
}
