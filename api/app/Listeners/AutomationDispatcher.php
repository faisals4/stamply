<?php

namespace App\Listeners;

use App\Events\CardIssued;
use App\Events\StampGiven;
use App\Models\Automation;
use App\Models\AutomationRun;
use App\Services\Automation\FlowEngine;

/**
 * Single listener that handles every automation-relevant event. For each
 * incoming event it:
 *   1. Looks up active automations matching the event's trigger type within
 *      the customer's tenant
 *   2. For each match, dedupes (one run per (automation, customer) per day),
 *      creates an `automation_run`, and calls the FlowEngine to execute it
 *
 * Run synchronously inside the request that fired the event. Wait nodes
 * inside the flow handle the deferral asynchronously via the tick command,
 * so the request itself never blocks waiting for them.
 */
class AutomationDispatcher
{
    public function __construct(private FlowEngine $engine) {}

    public function handleCardIssued(CardIssued $event): void
    {
        $this->dispatchTrigger('card_issued', $event->customer);
    }

    public function handleStampGiven(StampGiven $event): void
    {
        // Wired now so we don't need to come back when v2 adds stamp-based
        // triggers, but no MVP automation type uses it yet.
        $this->dispatchTrigger('stamp_given', $event->customer);
    }

    private function dispatchTrigger(string $triggerType, $customer): void
    {
        $automations = Automation::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $customer->tenant_id)
            ->where('status', 'active')
            ->where('trigger_type', $triggerType)
            ->get();

        foreach ($automations as $automation) {
            // Dedup: don't start a second run for the same customer if one
            // is already in progress.
            $existing = AutomationRun::query()
                ->withoutGlobalScopes()
                ->where('automation_id', $automation->id)
                ->where('customer_id', $customer->id)
                ->whereIn('status', ['queued', 'running', 'waiting'])
                ->exists();
            if ($existing) continue;

            $run = AutomationRun::create([
                'tenant_id' => $customer->tenant_id,
                'automation_id' => $automation->id,
                'customer_id' => $customer->id,
                'status' => 'queued',
                'current_step_index' => 0,
                'started_at' => now(),
            ]);

            $this->engine->run($run);
        }
    }
}
