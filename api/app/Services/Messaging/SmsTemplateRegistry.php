<?php

namespace App\Services\Messaging;

/**
 * SMS template registry — same 5 events as email, but each body is kept
 * short (ideally under 160 chars) because SMS costs grow per segment.
 */
class SmsTemplateRegistry
{
    public const KEYS = ['welcome', 'birthday', 'winback', 'redemption', 'campaign'];

    /**
     * @return array<string, array{
     *   name: string,
     *   description: string,
     *   icon: string,
     *   variables: array<string, string>,
     *   default_body: string,
     * }>
     */
    public static function all(): array
    {
        return [
            'welcome' => [
                'name' => 'رسالة ترحيبية',
                'description' => 'SMS ترحيبي فور تسجيل عميل جديد',
                'icon' => 'user-plus',
                'variables' => self::customerVars() + self::cardVars() + [
                    'card.install_url' => 'رابط تثبيت البطاقة',
                ],
                'default_body' => '👋 أهلاً {{customer.first_name}}! تم إصدار بطاقتك في {{brand.name}}. افتحها هنا: {{card.install_url}}',
            ],

            'birthday' => [
                'name' => 'عيد الميلاد',
                'description' => 'SMS تهنئة يوم عيد ميلاد العميل',
                'icon' => 'cake',
                'variables' => self::customerVars() + self::cardVars() + [
                    'card.birthday_stamps' => 'عدد الأختام الهدية',
                ],
                'default_body' => '🎂 كل عام وأنت بخير {{customer.first_name}}! أهديناك {{card.birthday_stamps}} طوابع في بطاقتك لدى {{brand.name}}.',
            ],

            'winback' => [
                'name' => 'تذكير العودة',
                'description' => 'SMS لإعادة جذب العملاء غير النشطين',
                'icon' => 'bell',
                'variables' => self::customerVars() + self::cardVars() + [
                    'card.days_since_last_visit' => 'أيام منذ آخر زيارة',
                ],
                'default_body' => '😊 اشتقنا لك {{customer.first_name}}! مر {{card.days_since_last_visit}} يوم من آخر زيارة. بطاقتك في {{brand.name}} تنتظرك.',
            ],

            'redemption' => [
                'name' => 'تأكيد الاستبدال',
                'description' => 'SMS إيصال فور صرف المكافأة',
                'icon' => 'mail',
                'variables' => self::customerVars() + [
                    'reward.name' => 'اسم المكافأة',
                    'reward.code' => 'كود الاستبدال',
                    'brand.name' => 'اسم النشاط',
                ],
                'default_body' => '✅ تم استبدال مكافأتك "{{reward.name}}" في {{brand.name}}. شكراً لولائك!',
            ],

            'campaign' => [
                'name' => 'حملة يدوية',
                'description' => 'قالب افتراضي للحملات التسويقية اليدوية',
                'icon' => 'megaphone',
                'variables' => self::customerVars() + [
                    'campaign.body' => 'محتوى الحملة',
                ],
                'default_body' => '{{customer.first_name}}، {{campaign.body}} — {{brand.name}}',
            ],
        ];
    }

    private static function customerVars(): array
    {
        return [
            'customer.first_name' => 'الاسم الأول',
            'customer.last_name' => 'الاسم الأخير',
            'customer.full_name' => 'الاسم الكامل',
            'customer.phone' => 'رقم الجوال',
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
