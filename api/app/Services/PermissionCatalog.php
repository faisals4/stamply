<?php

namespace App\Services;

/**
 * Source of truth for all tenant-side permissions.
 *
 * Permissions are stored on tenant.settings['role_permissions'][$role] as a
 * list of allowed keys. Defaults are computed from the catalog below.
 *
 * NOTE: permissions are currently metadata only — they are NOT yet enforced
 * at the route/middleware level. That pass is tracked for a later iteration.
 */
class PermissionCatalog
{
    public const ROLES = ['admin', 'manager', 'cashier'];

    /**
     * @return array<string, array{label: string, permissions: array<string, string>}>
     */
    public static function groups(): array
    {
        return [
            'overview' => [
                'label' => 'النظرة العامة',
                'permissions' => [
                    'dashboard.view' => 'مشاهدة لوحة التحكم',
                ],
            ],
            'cards' => [
                'label' => 'البطاقات',
                'permissions' => [
                    'cards.view' => 'مشاهدة البطاقات',
                    'cards.manage' => 'إضافة وتعديل البطاقات',
                    'cards.publish' => 'نشر / إخفاء البطاقات',
                    'cards.delete' => 'حذف البطاقات',
                ],
            ],
            'customers' => [
                'label' => 'العملاء',
                'permissions' => [
                    'customers.view' => 'مشاهدة العملاء',
                    'customers.manage' => 'تعديل بيانات العملاء',
                    'customers.delete' => 'حذف العملاء',
                    'customers.export' => 'تصدير بيانات العملاء',
                ],
            ],
            'scan' => [
                'label' => 'ماسح الكاشير',
                'permissions' => [
                    'scan.use' => 'فتح ماسح الكاشير',
                    'scan.give_stamp' => 'إعطاء الأختام',
                    'scan.redeem' => 'صرف المكافآت',
                ],
            ],
            'messaging' => [
                'label' => 'الرسائل',
                'permissions' => [
                    'messages.send' => 'إرسال رسائل جماعية',
                ],
            ],
            'automations' => [
                'label' => 'الأتمتة',
                'permissions' => [
                    'automations.view' => 'مشاهدة الأتمتة',
                    'automations.manage' => 'إنشاء وتعديل الأتمتة',
                ],
            ],
            'locations' => [
                'label' => 'المواقع',
                'permissions' => [
                    'locations.view' => 'مشاهدة الفروع',
                    'locations.manage' => 'إضافة وتعديل الفروع',
                ],
            ],
            'staff' => [
                'label' => 'المستخدمون',
                'permissions' => [
                    'staff.view' => 'مشاهدة المستخدمين',
                    'staff.manage' => 'إضافة وتعديل المستخدمين',
                    'staff.permissions' => 'تعديل الصلاحيات',
                ],
            ],
            'reports' => [
                'label' => 'التقارير',
                'permissions' => [
                    'reports.view' => 'مشاهدة التقارير والإحصائيات',
                    'reports.export' => 'تصدير CSV (عملاء، أختام، مكافآت)',
                ],
            ],
            'settings' => [
                'label' => 'الإعدادات',
                'permissions' => [
                    'settings.brand' => 'معلومات النشاط التجاري',
                    'settings.integrations' => 'ربط البريد الإلكتروني والرسائل',
                    'settings.templates' => 'قوالب الرسائل',
                ],
            ],
        ];
    }

    /** Flat list of every permission key in the catalog. */
    public static function allKeys(): array
    {
        $keys = [];
        foreach (self::groups() as $group) {
            foreach ($group['permissions'] as $key => $label) {
                $keys[] = $key;
            }
        }
        return $keys;
    }

    /** Default "allowed" list per role, used when a tenant hasn't customised. */
    public static function defaultsFor(string $role): array
    {
        return match ($role) {
            'admin' => self::allKeys(),

            'manager' => [
                'dashboard.view',
                'cards.view', 'cards.manage', 'cards.publish',
                'customers.view', 'customers.manage', 'customers.export',
                'scan.use', 'scan.give_stamp', 'scan.redeem',
                'messages.send',
                'automations.view', 'automations.manage',
                'locations.view', 'locations.manage',
                'staff.view',
                'reports.view', 'reports.export',
                'settings.templates',
            ],

            'cashier' => [
                'dashboard.view',
                'customers.view',
                'scan.use', 'scan.give_stamp', 'scan.redeem',
            ],

            default => [],
        };
    }
}
