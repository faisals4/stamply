<?php

namespace App\Services\Automation;

use App\Models\Automation;
use App\Models\AutomationLog;
use App\Models\AutomationRun;
use App\Models\Customer;
use App\Models\IssuedCard;
use App\Models\Stamp;
use App\Services\Messaging\EmailService;
use App\Services\Messaging\PushService;
use App\Services\Messaging\SmsService;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Step-by-step interpreter for an automation flow.
 *
 * The flow_json is a flat array of step objects:
 *
 *   [
 *     {"id":"s1","type":"send_sms","config":{"body":"..."}},
 *     {"id":"s2","type":"wait","config":{"duration":1,"unit":"days"}},
 *     {"id":"s3","type":"add_stamps","config":{"count":2}},
 *     {"id":"s4","type":"stop"}
 *   ]
 *
 * The engine walks the array using `current_step_index` as a cursor. When it
 * hits a `wait` step it stores `wait_until` and returns — the tick command
 * picks the run back up later. When it hits the end (or a `stop`), it marks
 * the run completed.
 *
 * Crash-safety: every iteration is wrapped in try/catch. A thrown exception
 * sets status='failed' and stores the error message.
 */
class FlowEngine
{
    public function __construct(
        private SmsService $sms,
        private EmailService $email,
        private PushService $push,
    ) {}

    public function run(AutomationRun $run): void
    {
        // Defensive load — withoutGlobalScopes because the listener may run
        // outside of an authenticated tenant context. Eager-load
        // `profile` so the template merge vars below can read
        // first_name/last_name/email/phone via the proxy accessors
        // without firing lazy queries mid-send.
        $automation = Automation::withoutGlobalScopes()->find($run->automation_id);
        $customer = Customer::withoutGlobalScopes()
            ->withTrashed()
            ->with('profile')
            ->find($run->customer_id);

        if (!$automation || !$customer) {
            $run->update([
                'status' => 'failed',
                'error_message' => 'Automation or customer not found',
                'completed_at' => now(),
            ]);
            return;
        }

        // Soft-deleted customers are simply skipped (their data is preserved
        // for compliance, but they shouldn't receive new marketing).
        if ($customer->trashed()) {
            $run->update([
                'status' => 'cancelled',
                'error_message' => 'Customer was deleted',
                'completed_at' => now(),
            ]);
            return;
        }

        $steps = $automation->flow_json['steps'] ?? [];
        $tenant = $automation->tenant;

        $run->update(['status' => 'running']);

        try {
            $index = $run->current_step_index;
            while ($index < count($steps)) {
                $step = $steps[$index];
                $type = $step['type'] ?? null;
                $config = $step['config'] ?? [];

                $halt = $this->executeStep(
                    $run,
                    $index,
                    $type,
                    $config,
                    $customer,
                    $automation,
                    $tenant,
                );

                // executeStep returns true when the engine must stop (wait
                // or completed/failed handled inline).
                if ($halt) return;

                $index++;
            }

            // Reached the end of the flow normally.
            $run->update([
                'status' => 'completed',
                'completed_at' => now(),
                'current_step_index' => $index,
            ]);
            $automation->increment('total_runs');
            $automation->update(['last_run_at' => now()]);
        } catch (Throwable $e) {
            $run->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);
        }
    }

    /**
     * Execute one step. Returns `true` if the engine should HALT (e.g. the
     * step put the run into a waiting state). Returns `false` to continue
     * to the next step.
     */
    private function executeStep(
        AutomationRun $run,
        int $index,
        ?string $type,
        array $config,
        Customer $customer,
        Automation $automation,
        $tenant,
    ): bool {
        switch ($type) {
            case 'send_sms':
                if (empty($customer->phone)) {
                    $this->log($run, $index, 'send_sms', 'Skipped: customer has no phone', 'skipped');
                    return false;
                }
                $body = $this->renderTemplate($config['body'] ?? '', $customer, $tenant);
                try {
                    $ok = $this->sms->send($customer->phone, $body);
                    $this->log($run, $index, 'send_sms', "Sent SMS to {$customer->phone}", $ok ? 'success' : 'failed');
                } catch (Throwable $e) {
                    $this->log($run, $index, 'send_sms', "Failed to send SMS", 'failed', $e->getMessage());
                }
                return false;

            case 'send_email':
                if (empty($customer->email)) {
                    $this->log($run, $index, 'send_email', 'Skipped: customer has no email', 'skipped');
                    return false;
                }
                $subject = $this->renderTemplate($config['subject'] ?? '', $customer, $tenant);
                $body = $this->renderTemplate($config['body'] ?? '', $customer, $tenant);
                try {
                    $ok = $this->email->send($customer->email, $subject, $body, $customer->full_name);
                    $this->log($run, $index, 'send_email', "Sent email to {$customer->email}", $ok ? 'success' : 'failed');
                } catch (Throwable $e) {
                    $this->log($run, $index, 'send_email', "Failed to send email", 'failed', $e->getMessage());
                }
                return false;

            case 'send_push':
                // Push has no per-customer gating like "has phone" or "has
                // email" — the customer either has active subscriptions or
                // they don't. dispatchToCustomer returns a count, so 0 =
                // nobody was subscribed and we log it as skipped.
                $title = $this->renderTemplate($config['title'] ?? '', $customer, $tenant);
                $body = $this->renderTemplate($config['body'] ?? '', $customer, $tenant);
                $url = isset($config['url']) && $config['url']
                    ? $this->renderTemplate($config['url'], $customer, $tenant)
                    : null;
                try {
                    $delivered = $this->push->dispatchToCustomer($customer->id, $title, $body, $url);
                    if ($delivered > 0) {
                        $this->log($run, $index, 'send_push', "Delivered push to {$delivered} device(s)", 'success');
                    } else {
                        $this->log($run, $index, 'send_push', 'Skipped: no subscribed devices', 'skipped');
                    }
                } catch (Throwable $e) {
                    $this->log($run, $index, 'send_push', 'Failed to dispatch push', 'failed', $e->getMessage());
                }
                return false;

            case 'add_stamps':
                $count = max(1, (int) ($config['count'] ?? 1));
                // Find the customer's most recent issued card. (MVP heuristic
                // — v2 will allow choosing a specific template per step.)
                $issued = IssuedCard::withoutGlobalScopes()
                    ->where('customer_id', $customer->id)
                    ->whereNull('deleted_at')
                    ->orderByDesc('id')
                    ->first();
                if (!$issued) {
                    $this->log($run, $index, 'add_stamps', "Skipped: customer has no issued card", 'skipped');
                    return false;
                }
                DB::transaction(function () use ($issued, $count, $automation, $customer) {
                    Stamp::create([
                        'tenant_id' => $customer->tenant_id,
                        'issued_card_id' => $issued->id,
                        'given_by_user_id' => $automation->created_by,
                        'count' => $count,
                        'reason' => 'automation',
                    ]);
                    $issued->increment('stamps_count', $count);
                    $issued->update(['last_used_at' => now()]);
                });
                $this->log($run, $index, 'add_stamps', "Added {$count} stamp(s) to card #{$issued->id}", 'success');
                return false;

            case 'condition':
                $field = $config['field'] ?? 'stamps_count';
                $operator = $config['operator'] ?? '>=';
                $threshold = (int) ($config['value'] ?? 0);
                $passed = $this->evaluateCondition($field, $operator, $threshold, $customer);
                $this->log(
                    $run,
                    $index,
                    'condition',
                    "{$field} {$operator} {$threshold}: " . ($passed ? 'passed' : 'failed'),
                    'success'
                );
                if (!$passed) {
                    // Skip the next step (typical "if X then do Y" linear branching)
                    $run->update(['current_step_index' => $index + 2]);
                    return false; // continue from index+1, but we add 1 more in the main loop
                }
                return false;

            case 'wait':
                $duration = (int) ($config['duration'] ?? 1);
                $unit = $config['unit'] ?? 'hours';
                $waitUntil = match ($unit) {
                    'minutes' => now()->addMinutes($duration),
                    'hours' => now()->addHours($duration),
                    'days' => now()->addDays($duration),
                    default => now()->addHours($duration),
                };
                $run->update([
                    'status' => 'waiting',
                    'wait_until' => $waitUntil,
                    'current_step_index' => $index + 1, // resume AFTER this wait
                ]);
                $this->log($run, $index, 'wait', "Waiting until {$waitUntil->toIso8601String()}", 'success');
                return true; // halt — tick command will resume

            case 'stop':
                $run->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                    'current_step_index' => $index + 1,
                ]);
                $this->log($run, $index, 'stop', 'Flow stopped explicitly', 'success');
                $automation->increment('total_runs');
                $automation->update(['last_run_at' => now()]);
                return true;

            default:
                $this->log($run, $index, $type ?? 'unknown', "Unknown step type", 'skipped');
                return false;
        }
    }

    private function evaluateCondition(string $field, string $operator, int $value, Customer $customer): bool
    {
        $actual = match ($field) {
            'stamps_count' => (int) IssuedCard::withoutGlobalScopes()
                ->where('customer_id', $customer->id)
                ->sum('stamps_count'),
            'days_since_signup' => (int) $customer->created_at?->diffInDays(now()),
            default => 0,
        };

        return match ($operator) {
            '>=' => $actual >= $value,
            '<=' => $actual <= $value,
            '>' => $actual > $value,
            '<' => $actual < $value,
            '==' => $actual == $value,
            '!=' => $actual != $value,
            default => false,
        };
    }

    /** Same variable substitution pattern as MessageController. */
    private function renderTemplate(string $template, Customer $customer, $tenant): string
    {
        $vars = [
            '{{customer.first_name}}' => $customer->first_name ?? '',
            '{{customer.last_name}}' => $customer->last_name ?? '',
            '{{customer.full_name}}' => $customer->full_name ?? '',
            '{{customer.email}}' => $customer->email ?? '',
            '{{customer.phone}}' => $customer->phone ?? '',
            '{{brand.name}}' => $tenant?->name ?? '',
        ];

        return str_replace(array_keys($vars), array_values($vars), $template);
    }

    private function log(
        AutomationRun $run,
        int $stepIndex,
        string $stepType,
        string $action,
        string $result,
        ?string $errorMessage = null,
    ): void {
        AutomationLog::create([
            'run_id' => $run->id,
            'step_index' => $stepIndex,
            'step_type' => $stepType,
            'action' => $action,
            'result' => $result,
            'error_message' => $errorMessage,
            'executed_at' => now(),
        ]);
    }
}
