/**
 * Country dial codes used by the phone input. Focused list of MENA + common
 * international destinations. National lengths are the typical mobile-number
 * length excluding the country code (used for soft validation).
 */
export interface Country {
  code: string // ISO 3166-1 alpha-2
  name: string // Arabic display name
  nameEn: string // English / search alias
  dial: string // E.164 dial code WITHOUT +
  flag: string // emoji
  /** Expected national mobile-number length, excluding the dial code. */
  nationalLength: number | number[]
}

export const COUNTRIES: Country[] = [
  // GCC + Levant + Egypt — top of the list
  { code: 'SA', name: 'السعودية', nameEn: 'Saudi Arabia', dial: '966', flag: '🇸🇦', nationalLength: 9 },
  { code: 'AE', name: 'الإمارات', nameEn: 'United Arab Emirates', dial: '971', flag: '🇦🇪', nationalLength: 9 },
  { code: 'KW', name: 'الكويت', nameEn: 'Kuwait', dial: '965', flag: '🇰🇼', nationalLength: 8 },
  { code: 'BH', name: 'البحرين', nameEn: 'Bahrain', dial: '973', flag: '🇧🇭', nationalLength: 8 },
  { code: 'QA', name: 'قطر', nameEn: 'Qatar', dial: '974', flag: '🇶🇦', nationalLength: 8 },
  { code: 'OM', name: 'عُمان', nameEn: 'Oman', dial: '968', flag: '🇴🇲', nationalLength: 8 },
  { code: 'YE', name: 'اليمن', nameEn: 'Yemen', dial: '967', flag: '🇾🇪', nationalLength: 9 },
  { code: 'JO', name: 'الأردن', nameEn: 'Jordan', dial: '962', flag: '🇯🇴', nationalLength: 9 },
  { code: 'LB', name: 'لبنان', nameEn: 'Lebanon', dial: '961', flag: '🇱🇧', nationalLength: [7, 8] },
  { code: 'PS', name: 'فلسطين', nameEn: 'Palestine', dial: '970', flag: '🇵🇸', nationalLength: 9 },
  { code: 'SY', name: 'سوريا', nameEn: 'Syria', dial: '963', flag: '🇸🇾', nationalLength: 9 },
  { code: 'IQ', name: 'العراق', nameEn: 'Iraq', dial: '964', flag: '🇮🇶', nationalLength: 10 },
  { code: 'EG', name: 'مصر', nameEn: 'Egypt', dial: '20', flag: '🇪🇬', nationalLength: 10 },

  // North Africa
  { code: 'LY', name: 'ليبيا', nameEn: 'Libya', dial: '218', flag: '🇱🇾', nationalLength: 9 },
  { code: 'TN', name: 'تونس', nameEn: 'Tunisia', dial: '216', flag: '🇹🇳', nationalLength: 8 },
  { code: 'DZ', name: 'الجزائر', nameEn: 'Algeria', dial: '213', flag: '🇩🇿', nationalLength: 9 },
  { code: 'MA', name: 'المغرب', nameEn: 'Morocco', dial: '212', flag: '🇲🇦', nationalLength: 9 },
  { code: 'SD', name: 'السودان', nameEn: 'Sudan', dial: '249', flag: '🇸🇩', nationalLength: 9 },
  { code: 'SO', name: 'الصومال', nameEn: 'Somalia', dial: '252', flag: '🇸🇴', nationalLength: 8 },
  { code: 'MR', name: 'موريتانيا', nameEn: 'Mauritania', dial: '222', flag: '🇲🇷', nationalLength: 8 },
  { code: 'DJ', name: 'جيبوتي', nameEn: 'Djibouti', dial: '253', flag: '🇩🇯', nationalLength: 8 },
  { code: 'KM', name: 'جزر القمر', nameEn: 'Comoros', dial: '269', flag: '🇰🇲', nationalLength: 7 },

  // Other common
  { code: 'TR', name: 'تركيا', nameEn: 'Turkey', dial: '90', flag: '🇹🇷', nationalLength: 10 },
  { code: 'IR', name: 'إيران', nameEn: 'Iran', dial: '98', flag: '🇮🇷', nationalLength: 10 },
  { code: 'PK', name: 'باكستان', nameEn: 'Pakistan', dial: '92', flag: '🇵🇰', nationalLength: 10 },
  { code: 'IN', name: 'الهند', nameEn: 'India', dial: '91', flag: '🇮🇳', nationalLength: 10 },
  { code: 'BD', name: 'بنغلاديش', nameEn: 'Bangladesh', dial: '880', flag: '🇧🇩', nationalLength: 10 },
  { code: 'ID', name: 'إندونيسيا', nameEn: 'Indonesia', dial: '62', flag: '🇮🇩', nationalLength: [9, 10, 11] },
  { code: 'MY', name: 'ماليزيا', nameEn: 'Malaysia', dial: '60', flag: '🇲🇾', nationalLength: [9, 10] },
  { code: 'PH', name: 'الفلبين', nameEn: 'Philippines', dial: '63', flag: '🇵🇭', nationalLength: 10 },
  { code: 'GB', name: 'المملكة المتحدة', nameEn: 'United Kingdom', dial: '44', flag: '🇬🇧', nationalLength: 10 },
  { code: 'US', name: 'الولايات المتحدة', nameEn: 'United States', dial: '1', flag: '🇺🇸', nationalLength: 10 },
  { code: 'CA', name: 'كندا', nameEn: 'Canada', dial: '1', flag: '🇨🇦', nationalLength: 10 },
  { code: 'FR', name: 'فرنسا', nameEn: 'France', dial: '33', flag: '🇫🇷', nationalLength: 9 },
  { code: 'DE', name: 'ألمانيا', nameEn: 'Germany', dial: '49', flag: '🇩🇪', nationalLength: [10, 11] },
  { code: 'IT', name: 'إيطاليا', nameEn: 'Italy', dial: '39', flag: '🇮🇹', nationalLength: 10 },
  { code: 'ES', name: 'إسبانيا', nameEn: 'Spain', dial: '34', flag: '🇪🇸', nationalLength: 9 },
  { code: 'NL', name: 'هولندا', nameEn: 'Netherlands', dial: '31', flag: '🇳🇱', nationalLength: 9 },
  { code: 'AU', name: 'أستراليا', nameEn: 'Australia', dial: '61', flag: '🇦🇺', nationalLength: 9 },
  { code: 'CN', name: 'الصين', nameEn: 'China', dial: '86', flag: '🇨🇳', nationalLength: 11 },
  { code: 'JP', name: 'اليابان', nameEn: 'Japan', dial: '81', flag: '🇯🇵', nationalLength: [10, 11] },
  { code: 'KR', name: 'كوريا الجنوبية', nameEn: 'South Korea', dial: '82', flag: '🇰🇷', nationalLength: [9, 10] },
]

export const DEFAULT_COUNTRY_CODE = 'SA'

export function findCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code)
}

export function isValidNationalLength(country: Country, national: string): boolean {
  const lengths = Array.isArray(country.nationalLength)
    ? country.nationalLength
    : [country.nationalLength]
  return lengths.includes(national.length)
}

/** Strips all non-digit characters and an optional leading zero. */
export function normalizeNational(input: string): string {
  // Convert Arabic-Indic digits to Latin
  const arabic = '٠١٢٣٤٥٦٧٨٩'
  const latin = input.replace(/[٠-٩]/g, (d) => String(arabic.indexOf(d)))
  // Strip non-digits
  let digits = latin.replace(/\D+/g, '')
  // Strip a single leading zero (common Arabic local format like 0555…)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits
}
