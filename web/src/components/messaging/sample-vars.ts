/**
 * Single source of truth for sample data used by every "live preview"
 * component (broadcast compose, email template editor, SMS template editor).
 *
 * Keep this file dependency-free so any messaging surface can import it.
 */
export const SAMPLE_VARS: Record<string, string> = {
  'customer.first_name': 'فيصل',
  'customer.last_name': 'العنزي',
  'customer.full_name': 'فيصل العنزي',
  'customer.phone': '+966555123456',
  'customer.email': 'faisal@example.com',
  'brand.name': 'Stamply',
  'card.name': 'بطاقة القهوة',
  'card.stamps': '3',
  'card.total_stamps': '10',
  'card.remaining': '7',
  'card.install_url': '/i/DEMO12345',
  'card.birthday_stamps': '2',
  'card.days_since_last_visit': '21',
  'reward.name': 'قهوة مجانية',
  'reward.code': 'ABC123',
  'campaign.subject': 'عرض خاص هذا الأسبوع',
  'campaign.body': 'خصم 20% على جميع المشروبات الساخنة.',
}

/** Replace `{{some.var}}` tokens in a template with values from SAMPLE_VARS. */
export function renderWithSampleVars(template: string): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, k) =>
    SAMPLE_VARS[k] ?? '',
  )
}
