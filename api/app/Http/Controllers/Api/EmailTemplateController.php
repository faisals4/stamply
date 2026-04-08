<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailTemplate;
use App\Services\Messaging\EmailService;
use App\Services\Messaging\TemplateRegistry;
use App\Services\Messaging\TemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailTemplateController extends Controller
{
    public function __construct(
        private readonly TemplateService $templates,
        private readonly EmailService $email,
    ) {}

    /**
     * GET /api/email-templates
     * List all templates for the current tenant. Lazy-seeds any missing
     * templates from the registry defaults so the UI always sees 5 rows.
     */
    public function index(): JsonResponse
    {
        $rows = collect(TemplateRegistry::KEYS)->map(function ($key) {
            $t = $this->templates->get($key);
            $meta = TemplateRegistry::all()[$key];

            return [
                'id' => $t->id,
                'key' => $t->key,
                'name' => $meta['name'],
                'description' => $meta['description'],
                'icon' => $meta['icon'],
                'subject' => $t->subject,
                'is_enabled' => $t->is_enabled,
                'updated_at' => $t->updated_at,
            ];
        });

        return response()->json(['data' => $rows]);
    }

    /**
     * GET /api/email-templates/{key}
     * Full template incl. HTML + available variables.
     */
    public function show(string $key): JsonResponse
    {
        $t = $this->templates->get($key);
        $meta = TemplateRegistry::all()[$key] ?? [];

        return response()->json(['data' => [
            'id' => $t->id,
            'key' => $t->key,
            'name' => $meta['name'] ?? $t->name,
            'description' => $meta['description'] ?? '',
            'icon' => $meta['icon'] ?? 'mail',
            'subject' => $t->subject,
            'html' => $t->html,
            'is_enabled' => $t->is_enabled,
            'variables' => $meta['variables'] ?? [],
            'default_subject' => $meta['default_subject'] ?? '',
            'default_html' => $meta['default_html'] ?? '',
            'updated_at' => $t->updated_at,
        ]]);
    }

    /**
     * PUT /api/email-templates/{key}
     */
    public function update(Request $request, string $key): JsonResponse
    {
        $data = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'html' => ['required', 'string'],
            'is_enabled' => ['nullable', 'boolean'],
        ]);

        $t = $this->templates->get($key);
        $t->update($data);

        return $this->show($key);
    }

    /**
     * POST /api/email-templates/{key}/reset
     * Reset subject + html to the registry defaults.
     */
    public function reset(string $key): JsonResponse
    {
        $defaults = TemplateRegistry::all()[$key] ?? abort(404);
        $t = $this->templates->get($key);
        $t->update([
            'subject' => $defaults['default_subject'],
            'html' => $defaults['default_html'],
        ]);

        return $this->show($key);
    }

    /**
     * POST /api/email-templates/{key}/test
     * Render + send the template with sample values to a given address.
     * Body: { to: string, subject?: string, html?: string }
     * If subject/html are provided, they override the saved template (so the
     * user can preview unsaved changes).
     */
    public function test(Request $request, string $key): JsonResponse
    {
        $data = $request->validate([
            'to' => ['required', 'email'],
            'subject' => ['nullable', 'string'],
            'html' => ['nullable', 'string'],
        ]);

        $t = $this->templates->get($key);
        $subject = $data['subject'] ?? $t->subject;
        $html = $data['html'] ?? $t->html;

        $vars = $this->sampleVars();
        $renderedSubject = $this->templates->render($subject, $vars);
        $renderedHtml = $this->templates->render($html, $vars);

        $ok = $this->email->send(
            to: $data['to'],
            subject: '[اختبار] '.$renderedSubject,
            body: $renderedHtml,
        );

        return response()->json([
            'ok' => $ok,
            'message' => $ok ? 'تم إرسال رسالة الاختبار' : 'فشل الإرسال',
        ], $ok ? 200 : 422);
    }

    /**
     * Sample values used when previewing or testing a template before real
     * customer data is substituted.
     */
    private function sampleVars(): array
    {
        return [
            'customer.first_name' => 'فيصل',
            'customer.last_name' => 'العنزي',
            'customer.full_name' => 'فيصل العنزي',
            'customer.phone' => '+966555123456',
            'customer.email' => 'faisal@example.com',
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
            'campaign.subject' => 'عرض خاص هذا الأسبوع',
            'campaign.body' => 'خصم 20% على جميع المشروبات الساخنة.',
        ];
    }

    public function store(Request $request)
    {
        abort(405);
    }

    public function destroy(string $key)
    {
        abort(405, 'Cannot delete built-in templates');
    }
}
