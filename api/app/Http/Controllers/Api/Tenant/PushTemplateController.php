<?php

namespace App\Http\Controllers\Api\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\PushToken;
use App\Services\Messaging\PushService;
use App\Services\Messaging\PushTemplateRegistry;
use App\Services\Messaging\PushTemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CRUD + test for per-tenant push templates. Mirrors SmsTemplateController
 * one-to-one — same 5 keys (welcome/birthday/winback/redemption/campaign),
 * same lazy-seed-on-first-access behaviour, same test flow.
 */
class PushTemplateController extends Controller
{
    public function __construct(
        private readonly PushTemplateService $templates,
        private readonly PushService $push,
    ) {}

    public function index(): JsonResponse
    {
        $rows = collect(PushTemplateRegistry::KEYS)->map(function ($key) {
            $t = $this->templates->get($key);
            $meta = PushTemplateRegistry::all()[$key];

            return [
                'id' => $t->id,
                'key' => $t->key,
                'name' => $meta['name'],
                'description' => $meta['description'],
                'icon' => $meta['icon'],
                'title' => $t->title,
                'body' => $t->body,
                'url' => $t->url,
                'is_enabled' => $t->is_enabled,
                'updated_at' => $t->updated_at,
            ];
        });

        return response()->json(['data' => $rows]);
    }

    public function show(string $key): JsonResponse
    {
        $t = $this->templates->get($key);
        $meta = PushTemplateRegistry::all()[$key] ?? [];

        return response()->json(['data' => [
            'id' => $t->id,
            'key' => $t->key,
            'name' => $meta['name'] ?? $t->name,
            'description' => $meta['description'] ?? '',
            'icon' => $meta['icon'] ?? 'bell',
            'title' => $t->title,
            'body' => $t->body,
            'url' => $t->url,
            'is_enabled' => $t->is_enabled,
            'variables' => $meta['variables'] ?? [],
            'default_title' => $meta['default_title'] ?? '',
            'default_body' => $meta['default_body'] ?? '',
            'default_url' => $meta['default_url'] ?? '',
            'updated_at' => $t->updated_at,
        ]]);
    }

    public function update(Request $request, string $key): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:2000'],
            'url' => ['nullable', 'string', 'max:500'],
            'is_enabled' => ['nullable', 'boolean'],
        ]);

        $t = $this->templates->get($key);
        $t->update($data);

        return $this->show($key);
    }

    public function reset(string $key): JsonResponse
    {
        $defaults = PushTemplateRegistry::all()[$key] ?? abort(404);
        $t = $this->templates->get($key);
        $t->update([
            'title' => $defaults['default_title'],
            'body' => $defaults['default_body'],
            'url' => $defaults['default_url'] ?: null,
        ]);

        return $this->show($key);
    }

    /**
     * POST /api/push-templates/{key}/test
     *
     * Sends the template to the current user (first customer that has any
     * push token for the tenant, since the admin themselves don't have a
     * tenant-scoped token). Purely diagnostic.
     */
    public function test(Request $request, string $key): JsonResponse
    {
        $data = $request->validate([
            'customer_id' => ['nullable', 'integer'],
            'title' => ['nullable', 'string'],
            'body' => ['nullable', 'string'],
            'url' => ['nullable', 'string'],
        ]);

        $t = $this->templates->get($key);
        $title = $data['title'] ?? $t->title;
        $body = $data['body'] ?? $t->body;
        $url = $data['url'] ?? $t->url;

        $vars = $this->sampleVars();
        $renderedTitle = '[اختبار] '.$this->templates->render($title, $vars);
        $renderedBody = $this->templates->render($body, $vars);
        $renderedUrl = $url ? $this->templates->render($url, $vars) : null;

        // Pick a customer with an active subscription — either the one the
        // admin named, or the first subscriber they have.
        $customer = null;
        if (! empty($data['customer_id'])) {
            $customer = Customer::find($data['customer_id']);
        }
        if (! $customer) {
            $tokenRow = PushToken::withoutGlobalScopes()
                ->where('tenant_id', $request->user()->tenant_id)
                ->first();
            if ($tokenRow) {
                $customer = Customer::find($tokenRow->customer_id);
            }
        }

        if (! $customer) {
            return response()->json([
                'ok' => false,
                'message' => 'لا يوجد أي مشترك لإرسال اختبار إليه — فعّل التنبيهات من بطاقة عميل أولاً',
            ], 422);
        }

        $delivered = $this->push->dispatchToCustomer(
            $customer->id,
            $renderedTitle,
            $renderedBody,
            $renderedUrl,
        );

        return response()->json([
            'ok' => $delivered > 0,
            'delivered' => $delivered,
            'message' => $delivered > 0
                ? "تم إرسال التنبيه إلى {$delivered} جهاز"
                : 'لم يُسلَّم — تحقّق من الإعدادات أو أن المشترك ما زال نشطاً',
        ], $delivered > 0 ? 200 : 422);
    }

    private function sampleVars(): array
    {
        return [
            'customer.first_name' => 'فيصل',
            'customer.last_name' => 'العنزي',
            'customer.full_name' => 'فيصل العنزي',
            'brand.name' => 'Stamply',
            'card.name' => 'بطاقة القهوة',
            'card.stamps' => 3,
            'card.total_stamps' => 10,
            'card.remaining' => 7,
            'card.install_url' => url('/i/DEMO12345'),
            'card.birthday_stamps' => 2,
            'card.days_since_last_visit' => 21,
            'reward.name' => 'قهوة مجانية',
            'reward.code' => 'ABC123',
            'campaign.body' => 'خصم 20% هذا الأسبوع',
        ];
    }
}
