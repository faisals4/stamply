<?php

namespace App\Console\Commands;

use App\Services\Messaging\EmailService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Send a test email to a given address.
 *
 * Usage:
 *   php artisan mail:test you@example.com
 */
#[Signature('mail:test {to}')]
#[Description('Send a Stamply test email via the configured mail transport')]
class TestMailCommand extends Command
{
    public function handle(EmailService $email): int
    {
        $to = (string) $this->argument('to');
        $this->info("Sending test email to {$to}...");

        $body = <<<'HTML'
        <div dir="rtl" style="font-family:'IBM Plex Sans Arabic',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;color:#111827;">
          <div style="text-align:center;padding:32px 0;">
            <div style="display:inline-block;width:56px;height:56px;border-radius:14px;background:#3b82f6;"></div>
            <h1 style="margin:16px 0 4px;font-size:24px;color:#111827;">Stamply</h1>
            <p style="margin:0;color:#6b7280;font-size:14px;">بطاقات ولاء رقمية</p>
          </div>
          <div style="padding:24px;background:#f9fafb;border-radius:12px;">
            <h2 style="margin:0 0 8px;font-size:18px;">✅ تم الاتصال بنجاح</h2>
            <p style="margin:0;line-height:1.6;color:#374151;">
              هذه رسالة اختبار للتأكد من أن خدمة البريد الإلكتروني (SendGrid SMTP)
              متصلة وتعمل بشكل صحيح.
            </p>
          </div>
          <p style="margin-top:24px;font-size:12px;color:#9ca3af;text-align:center;">
            Stamply — رسالة تجريبية من بيئة التطوير
          </p>
        </div>
        HTML;

        $ok = $email->send(
            to: $to,
            subject: '✅ Stamply — اختبار البريد الإلكتروني',
            body: $body,
        );

        if ($ok) {
            $this->info('✅ Email accepted by transport. Check the recipient inbox (and spam folder).');

            return self::SUCCESS;
        }

        $this->error('❌ Email failed. Check storage/logs/laravel.log for details.');

        return self::FAILURE;
    }
}
