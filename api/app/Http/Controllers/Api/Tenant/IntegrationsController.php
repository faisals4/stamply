<?php

namespace App\Http\Controllers\Api\Tenant;

use App\Http\Controllers\Controller;
use App\Services\Messaging\EmailService;
use App\Services\Messaging\PushService;
use App\Services\Messaging\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class IntegrationsController extends Controller
{
    public function __construct(
        private readonly EmailService $email,
        private readonly SmsService $sms,
        private readonly PushService $push,
    ) {}

    /**
     * GET /api/integrations/email
     * Returns the current email config for the authenticated tenant
     * (password masked).
     */
    public function showEmail(): JsonResponse
    {
        return response()->json(['data' => $this->email->getConfigMasked()]);
    }

    /**
     * PUT /api/integrations/email
     * Update tenant email config. Leave `password` empty to keep existing.
     */
    public function updateEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'enabled' => ['nullable', 'boolean'],
            'provider' => ['nullable', 'string', 'max:64'],
            'host' => ['nullable', 'string', 'max:255'],
            'port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:1024'],
            'encryption' => ['nullable', 'string', 'in:tls,ssl,none'],
            'from_address' => ['nullable', 'email'],
            'from_name' => ['nullable', 'string', 'max:255'],
        ]);

        // Drop empty password so we don't wipe the stored one on edit
        if (empty($data['password'])) {
            unset($data['password']);
        }

        $this->email->updateConfig($data);

        return response()->json(['data' => $this->email->getConfigMasked()]);
    }

    /**
     * POST /api/integrations/email/test
     * Send a real test email using either the saved config or a supplied
     * override (so the user can test BEFORE saving).
     *
     * Body: { to: string, override?: {...} }
     */
    public function testEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'to' => ['required', 'email'],
            'override' => ['nullable', 'array'],
        ]);

        $config = $this->email->getConfig();
        if (! empty($data['override'])) {
            $config = array_merge($config, array_filter($data['override'], fn ($v) => $v !== null && $v !== ''));
        }

        // Force enabled for the test regardless of the persisted flag
        $config['enabled'] = true;

        try {
            // Use the public send() with a runtime override via temporary update
            $body = <<<'HTML'
            <div dir="rtl" style="font-family:'IBM Plex Sans Arabic',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;color:#111827;">
              <div style="text-align:center;padding:24px 0;">
                <div style="display:inline-block;width:56px;height:56px;border-radius:14px;background:#3b82f6;"></div>
                <h1 style="margin:16px 0 4px;font-size:24px;">Stamply</h1>
                <p style="margin:0;color:#6b7280;">بطاقات ولاء رقمية</p>
              </div>
              <div style="padding:24px;background:#f9fafb;border-radius:12px;">
                <h2 style="margin:0 0 8px;font-size:18px;">✅ تم اختبار الاتصال بنجاح</h2>
                <p style="margin:0;line-height:1.6;color:#374151;">
                  هذه رسالة اختبار من إعدادات الدمج في Stamply — إذا وصلت، فإعداداتك تعمل.
                </p>
              </div>
            </div>
            HTML;

            // Use the EmailService send pipeline but with the override config
            // by temporarily swapping tenant settings — cleanest is a direct
            // Mailer build here:
            $reflected = new \ReflectionClass($this->email);
            $buildMailer = $reflected->getMethod('buildMailer');
            $buildMailer->setAccessible(true);
            /** @var \Symfony\Component\Mailer\Mailer $mailer */
            $mailer = $buildMailer->invoke($this->email, $config);

            $message = (new \Symfony\Component\Mime\Email())
                ->from(new \Symfony\Component\Mime\Address(
                    $config['from_address'],
                    $config['from_name'] ?? '',
                ))
                ->to(new \Symfony\Component\Mime\Address($data['to']))
                ->subject('✅ Stamply — اختبار البريد الإلكتروني')
                ->html($body);

            $mailer->send($message);

            return response()->json([
                'ok' => true,
                'message' => 'تم إرسال رسالة الاختبار بنجاح',
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'ok' => false,
                'message' => 'فشل الإرسال: '.$e->getMessage(),
            ], 422);
        }
    }

    /* ──────────────────────────────────────────────────────────── */
    /*  SMS (Twilio) — tenant-level for marketing templates         */
    /* ──────────────────────────────────────────────────────────── */

    /**
     * GET /api/integrations/sms
     */
    public function showSms(): JsonResponse
    {
        return response()->json(['data' => $this->sms->getConfigMasked()]);
    }

    /**
     * PUT /api/integrations/sms
     * Leave `auth_token` empty to keep the existing one.
     */
    public function updateSms(Request $request): JsonResponse
    {
        $data = $request->validate([
            'enabled' => ['nullable', 'boolean'],
            'provider' => ['nullable', 'string', 'max:64'],
            'account_sid' => ['nullable', 'string', 'max:255'],
            'auth_token' => ['nullable', 'string', 'max:1024'],
            'from_number' => ['nullable', 'string', 'max:32'],
        ]);

        if (empty($data['auth_token'])) {
            unset($data['auth_token']);
        }

        $this->sms->updateConfig($data);

        return response()->json(['data' => $this->sms->getConfigMasked()]);
    }

    /**
     * POST /api/integrations/sms/test
     * Body: { to: string, override?: {...} }
     */
    public function testSms(Request $request): JsonResponse
    {
        $data = $request->validate([
            'to' => ['required', 'string', 'min:5', 'max:32'],
            'override' => ['nullable', 'array'],
        ]);

        $config = $this->sms->getConfig();
        if (! empty($data['override'])) {
            $config = array_merge(
                $config,
                array_filter($data['override'], fn ($v) => $v !== null && $v !== ''),
            );
        }

        // Force enabled for the test regardless of the persisted flag
        $config['enabled'] = true;

        try {
            $client = $this->sms->buildClient($config);
            $client->messages->create($data['to'], [
                'from' => $config['from_number'],
                'body' => '✅ Stamply — رسالة اختبار. إذا وصلتك هذه الرسالة فإن إعدادات الـ SMS تعمل.',
            ]);

            return response()->json([
                'ok' => true,
                'message' => 'تم إرسال رسالة الاختبار بنجاح',
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'ok' => false,
                'message' => 'فشل الإرسال: '.$e->getMessage(),
            ], 422);
        }
    }

    /* ──────────────────────────────────────────────────────────── */
    /*  Push notifications (Web Push / APNs / FCM)                   */
    /* ──────────────────────────────────────────────────────────── */

    /**
     * GET /api/integrations/push
     *
     * Returns the push integration config visible to this tenant:
     * APNs credentials (tenant-scoped) + platform VAPID public key
     * (shared). VAPID keys are managed centrally by the platform
     * operator via /op — tenants no longer generate their own.
     */
    public function showPush(): JsonResponse
    {
        return response()->json(['data' => $this->push->getConfigMasked()]);
    }

    /**
     * PUT /api/integrations/push
     * Updates whatever fields are supplied. Empty strings are ignored so
     * partial updates don't wipe existing secrets.
     */
    public function updatePush(Request $request): JsonResponse
    {
        $data = $request->validate([
            'enabled' => ['nullable', 'boolean'],
            'vapid_public_key' => ['nullable', 'string', 'max:1024'],
            'vapid_private_key' => ['nullable', 'string', 'max:1024'],
            'vapid_subject' => ['nullable', 'string', 'max:255'],
            'apns_team_id' => ['nullable', 'string', 'max:32'],
            'apns_key_id' => ['nullable', 'string', 'max:32'],
            'apns_bundle_id' => ['nullable', 'string', 'max:255'],
            'apns_key' => ['nullable', 'string', 'max:8192'],
            'fcm_project_id' => ['nullable', 'string', 'max:128'],
            'fcm_service_account' => ['nullable', 'string', 'max:16384'],
        ]);

        $this->push->updateConfig($data);

        return response()->json(['data' => $this->push->getConfigMasked()]);
    }
}
