<?php

namespace App\Services\Messaging;

/**
 * Push notification template registry — same 5 events as email/sms so
 * all three channels stay in lockstep, but with a title + body + optional
 * URL instead of a subject + HTML body.
 *
 * Bodies are kept under ~120 chars because iOS truncates with "…" beyond
 * that in the notification banner.
 */
class PushTemplateRegistry
{
    public const KEYS = ['welcome', 'birthday', 'winback', 'redemption', 'campaign'];

    /**
     * @return array<string, array{
     *   name: string,
     *   description: string,
     *   icon: string,
     *   variables: array<string, string>,
     *   default_title: string,
     *   default_body: string,
     *   default_url: string,
     * }>
     */
    public static function all(): array
    {
        return [
            'welcome' => [
                'name' => 'تنبيه ترحيبي',
                'description' => 'إشعار ترحيبي فور تسجيل عميل جديد',
                'icon' => 'user-plus',
                'variables' => self::customerVars() + self::cardVars() + [
                    'card.install_url' => 'رابط تثبيت البطاقة',
                ],
                'default_title' => '👋 أهلاً {{customer.first_name}}!',
                'default_body' => 'بطاقتك في {{brand.name}} جاهزة. اضغط لاستعراضها.',
                'default_url' => '{{card.install_url}}',
            ],

            'birthday' => [
                'name' => 'تنبيه عيد الميلاد',
                'description' => 'تهنئة يوم عيد ميلاد العميل',
                'icon' => 'cake',
                'variables' => self::customerVars() + self::cardVars() + [
                    'card.birthday_stamps' => 'عدد الأختام الهدية',
                ],
                'default_title' => '🎂 كل عام وأنت بخير!',
                'default_body' => 'أهديناك {{card.birthday_stamps}} طوابع في بطاقتك لدى {{brand.name}}.',
                'default_url' => '',
            ],

            'winback' => [
                'name' => 'تذكير العودة',
                'description' => 'إعادة جذب العملاء غير النشطين',
                'icon' => 'bell',
                'variables' => self::customerVars() + self::cardVars() + [
                    'card.days_since_last_visit' => 'أيام منذ آخر زيارة',
                ],
                'default_title' => '😊 اشتقنا لك {{customer.first_name}}!',
                'default_body' => 'مرّ {{card.days_since_last_visit}} يوم على آخر زيارة. بطاقتك في {{brand.name}} تنتظرك.',
                'default_url' => '',
            ],

            'redemption' => [
                'name' => 'تأكيد الاستبدال',
                'description' => 'إيصال فور صرف المكافأة',
                'icon' => 'gift',
                'variables' => self::customerVars() + [
                    'reward.name' => 'اسم المكافأة',
                    'reward.code' => 'كود الاستبدال',
                    'brand.name' => 'اسم النشاط',
                ],
                'default_title' => '✅ تم استبدال مكافأتك',
                'default_body' => '"{{reward.name}}" في {{brand.name}}. شكراً لولائك!',
                'default_url' => '',
            ],

            'campaign' => [
                'name' => 'حملة يدوية',
                'description' => 'قالب افتراضي للحملات التسويقية اليدوية',
                'icon' => 'megaphone',
                'variables' => self::customerVars() + [
                    'campaign.body' => 'محتوى الحملة',
                ],
                'default_title' => '{{brand.name}}',
                'default_body' => '{{customer.first_name}}، {{campaign.body}}',
                'default_url' => '',
            ],
        ];
    }

    private static function customerVars(): array
    {
        return [
            'customer.first_name' => 'الاسم الأول',
            'customer.last_name' => 'الاسم الأخير',
            'customer.full_name' => 'الاسم الكامل',
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
}
