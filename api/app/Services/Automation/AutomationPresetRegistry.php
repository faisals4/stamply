<?php

namespace App\Services\Automation;

/**
 * Static catalog of ready-to-clone automation presets.
 *
 * Each preset is a complete automation definition that gets duplicated into
 * a draft when the user picks "ابدأ من قالب". After cloning the user can
 * tweak names, copy, wait durations, etc.
 *
 * Same shape as the email/sms TemplateRegistry pattern — pure static PHP,
 * no DB dependency.
 */
class AutomationPresetRegistry
{
    /**
     * @return array<string, array<string, mixed>>
     */
    public static function all(): array
    {
        return [
            'welcome_series' => [
                'key' => 'welcome_series',
                'name' => 'سلسلة الترحيب',
                'description' => 'رسالة ترحيب فورية + تذكير بعد يوم واحد',
                'icon' => 'sparkles',
                'trigger_type' => 'card_issued',
                'trigger_config' => [],
                'flow_json' => [
                    'steps' => [
                        [
                            'id' => 's1',
                            'type' => 'send_sms',
                            'config' => [
                                'body' => 'مرحبا {{customer.first_name}}! 👋 شكراً لانضمامك إلى {{brand.name}}. ابدأ بجمع أختامك واحصل على مكافآت رائعة.',
                            ],
                        ],
                        [
                            'id' => 's2',
                            'type' => 'wait',
                            'config' => ['duration' => 1, 'unit' => 'days'],
                        ],
                        [
                            'id' => 's3',
                            'type' => 'send_sms',
                            'config' => [
                                'body' => '{{customer.first_name}}، لا تنسَ زيارتنا قريباً لتجمع المزيد من الأختام! 🎁',
                            ],
                        ],
                    ],
                ],
            ],

            'birthday_reward' => [
                'key' => 'birthday_reward',
                'name' => 'هدية عيد الميلاد',
                'description' => 'تهنئة + ٢ ختم هدية في يوم عيد الميلاد',
                'icon' => 'cake',
                'trigger_type' => 'birthday',
                'trigger_config' => [],
                'flow_json' => [
                    'steps' => [
                        [
                            'id' => 's1',
                            'type' => 'send_sms',
                            'config' => [
                                'body' => '🎂 كل عام وأنت بخير {{customer.first_name}}! من {{brand.name}} هدية بسيطة: ٢ ختم على بطاقتك.',
                            ],
                        ],
                        [
                            'id' => 's2',
                            'type' => 'add_stamps',
                            'config' => ['count' => 2],
                        ],
                    ],
                ],
            ],

            'winback' => [
                'key' => 'winback',
                'name' => 'استرداد العملاء',
                'description' => 'رسالة "اشتقنا لك" بعد ٣٠ يوم من عدم النشاط',
                'icon' => 'heart',
                'trigger_type' => 'inactive',
                'trigger_config' => ['inactive_days' => 30],
                'flow_json' => [
                    'steps' => [
                        [
                            'id' => 's1',
                            'type' => 'send_sms',
                            'config' => [
                                'body' => '{{customer.first_name}}، اشتقنا لك في {{brand.name}}! 💙 تعال زورنا قريباً.',
                            ],
                        ],
                    ],
                ],
            ],

            'inactive_offer' => [
                'key' => 'inactive_offer',
                'name' => 'عرض إعادة التفعيل',
                'description' => 'رسالة + ختم هدية بعد ١٤ يوم من عدم النشاط',
                'icon' => 'gift',
                'trigger_type' => 'inactive',
                'trigger_config' => ['inactive_days' => 14],
                'flow_json' => [
                    'steps' => [
                        [
                            'id' => 's1',
                            'type' => 'send_sms',
                            'config' => [
                                'body' => '{{customer.first_name}}! 🎁 منحناك ختم هدية على بطاقتك. تعال احصل على مكافأتك من {{brand.name}}.',
                            ],
                        ],
                        [
                            'id' => 's2',
                            'type' => 'add_stamps',
                            'config' => ['count' => 1],
                        ],
                    ],
                ],
            ],

            'welcome_with_followup' => [
                'key' => 'welcome_with_followup',
                'name' => 'ترحيب + متابعة بعد ٣ أيام',
                'description' => 'رسالة ترحيب + متابعة بعرض خاص بعد ٣ أيام',
                'icon' => 'star',
                'trigger_type' => 'card_issued',
                'trigger_config' => [],
                'flow_json' => [
                    'steps' => [
                        [
                            'id' => 's1',
                            'type' => 'send_sms',
                            'config' => [
                                'body' => 'أهلاً {{customer.first_name}} في {{brand.name}}! ⭐',
                            ],
                        ],
                        [
                            'id' => 's2',
                            'type' => 'wait',
                            'config' => ['duration' => 3, 'unit' => 'days'],
                        ],
                        [
                            'id' => 's3',
                            'type' => 'send_sms',
                            'config' => [
                                'body' => '{{customer.first_name}}، عرض خاص لك من {{brand.name}}: تعال اليوم واحصل على ختم مجاني!',
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    public static function find(string $key): ?array
    {
        return self::all()[$key] ?? null;
    }
}
