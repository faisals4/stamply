<?php

namespace App\Services\Messaging;

/**
 * Static registry of known email template keys, their user-facing names,
 * descriptions (for the Settings UI), and the list of variables that each
 * template can use.
 *
 * The registry is the source of truth — seeders and the UI both read from it.
 */
class TemplateRegistry
{
    public const KEYS = ['welcome', 'birthday', 'winback', 'redemption', 'campaign'];

    /**
     * @return array<string, array{
     *   name: string,
     *   description: string,
     *   icon: string,
     *   variables: array<string, string>,
     *   default_subject: string,
     *   default_html: string,
     * }>
     */
    public static function all(): array
    {
        return [
            'welcome' => [
                'name' => 'رسالة ترحيبية',
                'description' => 'تُرسل تلقائياً لكل عميل جديد فور تسجيل بطاقته',
                'icon' => 'user-plus',
                'variables' => self::customerVars() + self::cardVars() + [
                    'card.install_url' => 'رابط تثبيت البطاقة',
                ],
                'default_subject' => 'أهلاً بك في {{brand.name}} 🎉',
                'default_html' => self::wrap(
                    'أهلاً {{customer.first_name}}! 👋',
                    '<p>شكراً لتسجيلك في بطاقة <strong>{{card.name}}</strong>.</p>
<p>بدأت رحلتك معنا برصيد <strong>{{card.stamps}}</strong> من أصل <strong>{{card.total_stamps}}</strong> طابع.</p>
<p style="margin:24px 0;text-align:center;">
  <a href="{{card.install_url}}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">افتح بطاقتك</a>
</p>
<p style="color:#6b7280;font-size:13px;">في كل مرة تزورنا، أرِ الموظف رمز QR في بطاقتك وسنضيف لك طابعاً.</p>',
                ),
            ],

            'birthday' => [
                'name' => 'عيد الميلاد',
                'description' => 'تُرسل يوم عيد ميلاد العميل مع إشعار بالأختام المجانية',
                'icon' => 'cake',
                'variables' => self::customerVars() + self::cardVars() + [
                    'card.birthday_stamps' => 'عدد الأختام الهدية',
                ],
                'default_subject' => 'كل عام وأنت بخير يا {{customer.first_name}} 🎂',
                'default_html' => self::wrap(
                    'عيد ميلاد سعيد! 🎉',
                    '<p>نيابةً عن فريق {{brand.name}}، نتمنى لك عاماً مليئاً بالسعادة والنجاح.</p>
<p style="margin:24px 0;padding:20px;background:#fef3c7;border-radius:12px;text-align:center;color:#78350f;">
  🎁 أضفنا لك <strong style="font-size:24px;">{{card.birthday_stamps}}</strong> طوابع هدية في بطاقتك!
</p>
<p>بطاقتك الآن فيها <strong>{{card.stamps}}</strong> من أصل <strong>{{card.total_stamps}}</strong> طابع.</p>
<p style="margin:24px 0;text-align:center;">
  <a href="{{card.install_url}}" style="display:inline-block;padding:12px 24px;background:#ec4899;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">افتح بطاقتك</a>
</p>',
                ),
            ],

            'winback' => [
                'name' => 'تذكير العودة',
                'description' => 'تُرسل لمن لم يزر منذ فترة (مخصصة في إعدادات الأتمتة)',
                'icon' => 'bell',
                'variables' => self::customerVars() + self::cardVars() + [
                    'card.days_since_last_visit' => 'أيام منذ آخر زيارة',
                ],
                'default_subject' => 'اشتقنا لك، {{customer.first_name}} 🫶',
                'default_html' => self::wrap(
                    'وحشتنا!',
                    '<p>مر <strong>{{card.days_since_last_visit}}</strong> يوم منذ آخر زيارة لك لـ {{brand.name}}.</p>
<p>بطاقتك لازالت تنتظرك — رصيدك الحالي <strong>{{card.stamps}}</strong> من أصل <strong>{{card.total_stamps}}</strong> طابع.</p>
<p>تعال زرنا وسنسعد برؤيتك من جديد.</p>
<p style="margin:24px 0;text-align:center;">
  <a href="{{card.install_url}}" style="display:inline-block;padding:12px 24px;background:#f59e0b;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">افتح بطاقتي</a>
</p>',
                ),
            ],

            'redemption' => [
                'name' => 'تأكيد الاستبدال',
                'description' => 'إيصال رقمي يُرسل فور صرف مكافأة',
                'icon' => 'mail',
                'variables' => self::customerVars() + self::cardVars() + [
                    'reward.name' => 'اسم المكافأة',
                    'reward.code' => 'كود الاستبدال',
                ],
                'default_subject' => 'تم استبدال مكافأتك ✅',
                'default_html' => self::wrap(
                    'مبروك! 🎁',
                    '<p>تم صرف مكافأتك بنجاح:</p>
<div style="margin:24px 0;padding:20px;background:#d1fae5;border-radius:12px;text-align:center;color:#064e3b;">
  <div style="font-size:22px;font-weight:700;">{{reward.name}}</div>
  <div style="margin-top:8px;font-family:monospace;color:#065f46;">{{reward.code}}</div>
</div>
<p>شكراً لولائك لـ {{brand.name}} — نراك قريباً! 👋</p>',
                ),
            ],

            'campaign' => [
                'name' => 'حملة يدوية',
                'description' => 'قالب افتراضي للحملات التسويقية اليدوية من صفحة العملاء',
                'icon' => 'megaphone',
                'variables' => self::customerVars() + [
                    'campaign.subject' => 'عنوان الحملة',
                    'campaign.body' => 'محتوى الحملة',
                ],
                'default_subject' => '{{campaign.subject}}',
                'default_html' => self::wrap(
                    'أهلاً {{customer.first_name}}',
                    '<div>{{campaign.body}}</div>',
                ),
            ],
        ];
    }

    /** Common customer/brand variables shared by all templates. */
    private static function customerVars(): array
    {
        return [
            'customer.first_name' => 'الاسم الأول',
            'customer.last_name' => 'الاسم الأخير',
            'customer.full_name' => 'الاسم الكامل',
            'customer.phone' => 'رقم الجوال',
            'customer.email' => 'البريد الإلكتروني',
            'brand.name' => 'اسم النشاط التجاري',
        ];
    }

    private static function cardVars(): array
    {
        return [
            'card.name' => 'اسم البطاقة',
            'card.stamps' => 'عدد الأختام الحالية',
            'card.total_stamps' => 'إجمالي الأختام حتى المكافأة',
            'card.remaining' => 'الأختام المتبقية للمكافأة',
        ];
    }

    /** Wrap a heading + body in the default Stamply email chrome. */
    private static function wrap(string $title, string $body): string
    {
        return <<<HTML
<div dir="rtl" style="font-family:'IBM Plex Sans Arabic',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;color:#111827;">
  <div style="text-align:center;padding:16px 0 24px;border-bottom:1px solid #e5e7eb;">
    <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:#3b82f6;"></div>
    <div style="margin-top:8px;font-weight:700;color:#111827;font-size:18px;">{{brand.name}}</div>
  </div>
  <h1 style="margin:24px 0 16px;font-size:22px;color:#111827;">{$title}</h1>
  <div style="line-height:1.8;color:#374151;font-size:15px;">{$body}</div>
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px;">
    Powered by Stamply
  </div>
</div>
HTML;
    }
}
