<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Messaging\SmsService;
use App\Services\Messaging\SmsTemplateRegistry;
use App\Services\Messaging\SmsTemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmsTemplateController extends Controller
{
    public function __construct(
        private readonly SmsTemplateService $templates,
        private readonly SmsService $sms,
    ) {}

    public function index(): JsonResponse
    {
        $rows = collect(SmsTemplateRegistry::KEYS)->map(function ($key) {
            $t = $this->templates->get($key);
            $meta = SmsTemplateRegistry::all()[$key];

            return [
                'id' => $t->id,
                'key' => $t->key,
                'name' => $meta['name'],
                'description' => $meta['description'],
                'icon' => $meta['icon'],
                'body' => $t->body,
                'is_enabled' => $t->is_enabled,
                'updated_at' => $t->updated_at,
            ];
        });

        return response()->json(['data' => $rows]);
    }

    public function show(string $key): JsonResponse
    {
        $t = $this->templates->get($key);
        $meta = SmsTemplateRegistry::all()[$key] ?? [];

        return response()->json(['data' => [
            'id' => $t->id,
            'key' => $t->key,
            'name' => $meta['name'] ?? $t->name,
            'description' => $meta['description'] ?? '',
            'icon' => $meta['icon'] ?? 'smartphone',
            'body' => $t->body,
            'is_enabled' => $t->is_enabled,
            'variables' => $meta['variables'] ?? [],
            'default_body' => $meta['default_body'] ?? '',
            'updated_at' => $t->updated_at,
        ]]);
    }

    public function update(Request $request, string $key): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
            'is_enabled' => ['nullable', 'boolean'],
        ]);

        $t = $this->templates->get($key);
        $t->update($data);

        return $this->show($key);
    }

    public function reset(string $key): JsonResponse
    {
        $defaults = SmsTemplateRegistry::all()[$key] ?? abort(404);
        $t = $this->templates->get($key);
        $t->update(['body' => $defaults['default_body']]);

        return $this->show($key);
    }

    public function test(Request $request, string $key): JsonResponse
    {
        $data = $request->validate([
            'to' => ['required', 'string', 'min:5', 'max:32'],
            'body' => ['nullable', 'string'],
        ]);

        $t = $this->templates->get($key);
        $body = $data['body'] ?? $t->body;

        $rendered = $this->templates->render($body, $this->sampleVars());

        $ok = $this->sms->send($data['to'], '[اختبار] '.$rendered);

        return response()->json([
            'ok' => $ok,
            'message' => $ok ? 'تم إرسال رسالة الاختبار' : 'فشل الإرسال',
        ], $ok ? 200 : 422);
    }

    private function sampleVars(): array
    {
        return [
            'customer.first_name' => 'فيصل',
            'customer.last_name' => 'العنزي',
            'customer.full_name' => 'فيصل العنزي',
            'customer.phone' => '+966555123456',
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
