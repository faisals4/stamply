<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\PaginatesResponses;
use App\Http\Controllers\Controller;
use App\Models\Automation;
use App\Models\AutomationRun;
use App\Models\Customer;
use App\Services\Automation\AutomationPresetRegistry;
use App\Services\Automation\FlowEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Tenant marketing automation CRUD + execution control.
 *
 * Tenant scoping is automatic via the BelongsToTenant trait on the Automation
 * model. Permission gates: `automations.view` for reads, `automations.manage`
 * for writes.
 */
class AutomationController extends Controller
{
    use PaginatesResponses;

    public function index(Request $request): JsonResponse
    {
        $query = Automation::query()
            ->with('creator:id,name')
            ->withCount('runs')
            ->orderBy('created_at', 'desc');

        if ($trigger = $request->string('trigger_type')->toString()) {
            if (in_array($trigger, Automation::TRIGGER_TYPES, true)) {
                $query->where('trigger_type', $trigger);
            }
        }
        if ($status = $request->string('status')->toString()) {
            if (in_array($status, Automation::STATUSES, true)) {
                $query->where('status', $status);
            }
        }

        $paginator = $query->paginate($this->resolvePerPage($request));
        $paginator->through(fn (Automation $a) => $this->transform($a));

        return $this->paginated($paginator);
    }

    public function presets(): JsonResponse
    {
        return response()->json([
            'data' => array_values(AutomationPresetRegistry::all()),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $automation = Automation::with('creator:id,name')->withCount('runs')->findOrFail($id);

        return response()->json(['data' => $this->transform($automation, full: true)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);

        $automation = Automation::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'status' => $data['status'] ?? 'draft',
            'trigger_type' => $data['trigger_type'],
            'trigger_config' => $data['trigger_config'] ?? [],
            'flow_json' => $data['flow_json'],
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => $this->transform($automation->fresh('creator')->loadCount('runs'), full: true),
        ], 201);
    }

    public function fromPreset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'key' => ['required', 'string'],
        ]);
        $preset = AutomationPresetRegistry::find($data['key']);
        if (!$preset) {
            throw ValidationException::withMessages(['key' => ['القالب غير موجود']]);
        }

        $automation = Automation::create([
            'name' => $preset['name'],
            'description' => $preset['description'],
            'status' => 'draft',
            'trigger_type' => $preset['trigger_type'],
            'trigger_config' => $preset['trigger_config'],
            'flow_json' => $preset['flow_json'],
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => $this->transform($automation->fresh('creator')->loadCount('runs'), full: true),
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $automation = Automation::findOrFail($id);
        $data = $this->validatePayload($request);

        $automation->update([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'trigger_type' => $data['trigger_type'],
            'trigger_config' => $data['trigger_config'] ?? [],
            'flow_json' => $data['flow_json'],
        ]);

        return response()->json([
            'data' => $this->transform($automation->fresh('creator')->loadCount('runs'), full: true),
        ]);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(Automation::STATUSES)],
        ]);
        $automation = Automation::findOrFail($id);
        $automation->update(['status' => $data['status']]);

        return response()->json([
            'data' => $this->transform($automation->fresh('creator')->loadCount('runs'), full: true),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        Automation::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    public function runs(Request $request, string $id): JsonResponse
    {
        $automation = Automation::findOrFail($id);
        $query = AutomationRun::query()
            ->with(['customer:id,first_name,last_name,phone', 'logs'])
            ->where('automation_id', $automation->id)
            ->orderByDesc('started_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($from = $request->query('from')) {
            $query->whereDate('started_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->whereDate('started_at', '<=', $to);
        }

        $paginator = $query->paginate($this->resolvePerPage($request));
        $paginator->through(function ($run) {
                return [
                    'id' => $run->id,
                    'status' => $run->status,
                    'current_step_index' => $run->current_step_index,
                    'wait_until' => $run->wait_until?->toIso8601String(),
                    'started_at' => $run->started_at?->toIso8601String(),
                    'completed_at' => $run->completed_at?->toIso8601String(),
                    'error_message' => $run->error_message,
                    'customer' => $run->customer ? [
                        'id' => $run->customer->id,
                        'name' => $run->customer->full_name,
                        'phone' => $run->customer->phone,
                    ] : null,
                    'logs' => $run->logs->map(fn ($l) => [
                        'step_index' => $l->step_index,
                        'step_type' => $l->step_type,
                        'action' => $l->action,
                        'result' => $l->result,
                        'error_message' => $l->error_message,
                        'executed_at' => $l->executed_at?->toIso8601String(),
                    ]),
                ];
            });

        return $this->paginated($paginator);
    }

    /**
     * POST /api/automations/{id}/test — fire the automation manually for the
     * given customer (or a random one) regardless of trigger conditions. Used
     * by the editor's "test on a real customer" button.
     */
    public function test(Request $request, FlowEngine $engine, string $id): JsonResponse
    {
        $automation = Automation::findOrFail($id);
        $data = $request->validate([
            'customer_id' => ['nullable', 'integer'],
        ]);

        $customer = $data['customer_id']
            ? Customer::findOrFail($data['customer_id'])
            : Customer::first();
        if (!$customer) {
            throw ValidationException::withMessages(['customer' => ['لا يوجد عملاء لاختبار الأتمتة عليهم']]);
        }

        $run = AutomationRun::create([
            'tenant_id' => $automation->tenant_id,
            'automation_id' => $automation->id,
            'customer_id' => $customer->id,
            'status' => 'queued',
            'current_step_index' => 0,
            'started_at' => now(),
        ]);

        $engine->run($run);

        return response()->json(['data' => ['run_id' => $run->id, 'status' => $run->fresh()->status]]);
    }

    /* ─── helpers ─────────────────────────────────────────────── */

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['nullable', Rule::in(Automation::STATUSES)],
            'trigger_type' => ['required', Rule::in(Automation::TRIGGER_TYPES)],
            'trigger_config' => ['nullable', 'array'],
            'trigger_config.inactive_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'flow_json' => ['required', 'array'],
            'flow_json.steps' => ['required', 'array', 'min:1'],
            'flow_json.steps.*.id' => ['required', 'string'],
            'flow_json.steps.*.type' => ['required', Rule::in(Automation::STEP_TYPES)],
            'flow_json.steps.*.config' => ['nullable', 'array'],
        ]);
    }

    private function transform(Automation $a, bool $full = false): array
    {
        $base = [
            'id' => $a->id,
            'name' => $a->name,
            'description' => $a->description,
            'status' => $a->status,
            'trigger_type' => $a->trigger_type,
            'trigger_config' => $a->trigger_config ?? [],
            'total_runs' => $a->total_runs,
            'last_run_at' => $a->last_run_at?->toIso8601String(),
            'runs_count' => $a->runs_count ?? 0,
            'created_at' => $a->created_at?->toIso8601String(),
            'creator' => $a->creator ? ['id' => $a->creator->id, 'name' => $a->creator->name] : null,
        ];

        if ($full) {
            $base['flow_json'] = $a->flow_json ?? ['steps' => []];
        }

        return $base;
    }
}
