export interface Country {
  code: string
  dialCode: string
  nameAr: string
  nameEn: string
  flag: string
  /** Expected length of the local number (without country code) */
  maxLength: number
  /** Example local number shown as placeholder */
  example: string
  /** Strip leading zero — many countries write local numbers with a 0 prefix
   *  (e.g. 0555… in SA, 01XX… in EG) but the international format drops it. */
  stripLeadingZero: boolean
}

export const countries: Country[] = [
  { code: 'SA', dialCode: '+966', nameAr: 'السعودية', nameEn: 'Saudi Arabia', flag: '🇸🇦', maxLength: 9, example: '512345678', stripLeadingZero: true },
  { code: 'AE', dialCode: '+971', nameAr: 'الإمارات', nameEn: 'UAE', flag: '🇦🇪', maxLength: 9, example: '501234567', stripLeadingZero: true },
  { code: 'KW', dialCode: '+965', nameAr: 'الكويت', nameEn: 'Kuwait', flag: '🇰🇼', maxLength: 8, example: '51234567', stripLeadingZero: true },
  { code: 'BH', dialCode: '+973', nameAr: 'البحرين', nameEn: 'Bahrain', flag: '🇧🇭', maxLength: 8, example: '31234567', stripLeadingZero: true },
  { code: 'QA', dialCode: '+974', nameAr: 'قطر', nameEn: 'Qatar', flag: '🇶🇦', maxLength: 8, example: '51234567', stripLeadingZero: true },
  { code: 'OM', dialCode: '+968', nameAr: 'عمان', nameEn: 'Oman', flag: '🇴🇲', maxLength: 8, example: '91234567', stripLeadingZero: true },
  { code: 'EG', dialCode: '+20', nameAr: 'مصر', nameEn: 'Egypt', flag: '🇪🇬', maxLength: 10, example: '1012345678', stripLeadingZero: true },
  { code: 'JO', dialCode: '+962', nameAr: 'الأردن', nameEn: 'Jordan', flag: '🇯🇴', maxLength: 9, example: '712345678', stripLeadingZero: true },
  { code: 'LB', dialCode: '+961', nameAr: 'لبنان', nameEn: 'Lebanon', flag: '🇱🇧', maxLength: 8, example: '71234567', stripLeadingZero: true },
  { code: 'IQ', dialCode: '+964', nameAr: 'العراق', nameEn: 'Iraq', flag: '🇮🇶', maxLength: 10, example: '7712345678', stripLeadingZero: true },
  { code: 'YE', dialCode: '+967', nameAr: 'اليمن', nameEn: 'Yemen', flag: '🇾🇪', maxLength: 9, example: '712345678', stripLeadingZero: true },
  { code: 'SD', dialCode: '+249', nameAr: 'السودان', nameEn: 'Sudan', flag: '🇸🇩', maxLength: 9, example: '912345678', stripLeadingZero: true },
  { code: 'MA', dialCode: '+212', nameAr: 'المغرب', nameEn: 'Morocco', flag: '🇲🇦', maxLength: 9, example: '612345678', stripLeadingZero: true },
  { code: 'TN', dialCode: '+216', nameAr: 'تونس', nameEn: 'Tunisia', flag: '🇹🇳', maxLength: 8, example: '21234567', stripLeadingZero: true },
  { code: 'DZ', dialCode: '+213', nameAr: 'الجزائر', nameEn: 'Algeria', flag: '🇩🇿', maxLength: 9, example: '551234567', stripLeadingZero: true },
  { code: 'TR', dialCode: '+90', nameAr: 'تركيا', nameEn: 'Turkey', flag: '🇹🇷', maxLength: 10, example: '5012345678', stripLeadingZero: true },
  { code: 'PK', dialCode: '+92', nameAr: 'باكستان', nameEn: 'Pakistan', flag: '🇵🇰', maxLength: 10, example: '3012345678', stripLeadingZero: true },
  { code: 'IN', dialCode: '+91', nameAr: 'الهند', nameEn: 'India', flag: '🇮🇳', maxLength: 10, example: '9123456789', stripLeadingZero: false },
  { code: 'US', dialCode: '+1', nameAr: 'أمريكا', nameEn: 'United States', flag: '🇺🇸', maxLength: 10, example: '2012345678', stripLeadingZero: false },
  { code: 'GB', dialCode: '+44', nameAr: 'بريطانيا', nameEn: 'United Kingdom', flag: '🇬🇧', maxLength: 10, example: '7123456789', stripLeadingZero: true },
  { code: 'DE', dialCode: '+49', nameAr: 'ألمانيا', nameEn: 'Germany', flag: '🇩🇪', maxLength: 11, example: '15123456789', stripLeadingZero: true },
  { code: 'FR', dialCode: '+33', nameAr: 'فرنسا', nameEn: 'France', flag: '🇫🇷', maxLength: 9, example: '612345678', stripLeadingZero: true },
  { code: 'PH', dialCode: '+63', nameAr: 'الفلبين', nameEn: 'Philippines', flag: '🇵🇭', maxLength: 10, example: '9123456789', stripLeadingZero: true },
  { code: 'ID', dialCode: '+62', nameAr: 'إندونيسيا', nameEn: 'Indonesia', flag: '🇮🇩', maxLength: 11, example: '81234567890', stripLeadingZero: true },
  { code: 'MY', dialCode: '+60', nameAr: 'ماليزيا', nameEn: 'Malaysia', flag: '🇲🇾', maxLength: 10, example: '1123456789', stripLeadingZero: true },
]

export const defaultCountry = countries[0]

/** Get the display name based on the current language */
export function countryName(country: Country, lang: string): string {
  return lang.startsWith('ar') ? country.nameAr : country.nameEn
}

/**
 * Sanitize phone input for a given country:
 * - Keep only digits
 * - Strip leading zero if the country expects it
 */
export function sanitizePhone(raw: string, country: Country): string {
  let digits = raw.replace(/\D/g, '')

  // Strip leading zero — e.g. user types 0555... for Saudi, we want 555...
  if (country.stripLeadingZero && digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '')
  }

  return digits.slice(0, country.maxLength)
}
