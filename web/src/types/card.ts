// Matches OneCup's 8 card types. Only `stamp` is fully implemented in Phase 1.
export type CardType =
  | 'stamp'
  | 'points'
  | 'membership'
  | 'discount'
  | 'cashback'
  | 'coupon'
  | 'multipass'
  | 'gift'

export type CardStatus = 'draft' | 'active' | 'inactive'

export type BarcodeType = 'pdf417' | 'qrcode'

export type RewardProgram = 'stamps' | 'spend' | 'products' | 'visits'

export interface CardReward {
  id: string
  name: string
  stampsRequired: number
}

/**
 * Customisable label strings shown on the card across every surface
 * (in-app PWA, Apple Wallet pass, Google Wallet pass). All optional —
 * each one falls back to the Arabic default when empty.
 *
 * Each label has an optional English variant (`*En`). When provided, the
 * Apple Wallet pass ships an `en.lproj/pass.strings` localisation so
 * iPhones with English as their device language see the English label,
 * while Arabic devices see the Arabic one. If the English variant is
 * left empty, the Arabic value is used everywhere.
 */
export interface CardLabels {
  /** Optional display title shown next to the logo. When empty, no
   *  title is rendered (matching Apple Wallet's behaviour when
   *  `logoText` is omitted from pass.json). */
  title?: string
  /** English translation of `title`. */
  titleEn?: string
  /** Stamps field label, e.g. "الأختام". */
  stamps?: string
  /** English translation of `stamps`, e.g. "Stamps". */
  stampsEn?: string
  /** Reward field label, e.g. "المكافأة". */
  reward?: string
  /** English translation of `reward`, e.g. "Gift". */
  rewardEn?: string
  /** Customer name field label, e.g. "العميل". */
  customer?: string
  /** English translation of `customer`, e.g. "Customer". */
  customerEn?: string
}

export interface CardDesign {
  /** Optional English translation of the card name. Shown on iPhones
   *  whose primary language is English via Apple Wallet's
   *  `en.lproj/pass.strings` localization. Empty falls back to the
   *  Arabic `card.name`. Lives here (inside the JSON design column)
   *  so we avoid an extra `card_templates.name_en` migration. */
  nameEn?: string
  stampsCount: number // 1..30
  activeStampIcon: string // lucide icon name
  inactiveStampIcon: string
  colors: {
    background: string
    foreground: string
    stampsBackground: string
    activeStamp: string
    inactiveStamp: string
  }
  /** Optional brand logo (PNG/JPG data URL or external URL). Shown on
   *  every surface — the in-app card header, the Apple Wallet logo box,
   *  and the Google Wallet program logo. */
  logoUrl?: string
  backgroundUrl?: string
  /** Customisable text labels — see {@link CardLabels}. */
  labels?: CardLabels
}

/** A field shown on the public registration form. */
export interface RegistrationField {
  /** Stable key. Built-in fields use reserved keys like 'name', 'phone'. */
  key: string
  /** Display label shown to the customer. */
  label: string
  /** Field type for rendering + validation. */
  type: 'text' | 'phone' | 'email' | 'date' | 'select'
  required: boolean
  /** True for built-in fields (name, phone) — cannot be removed or made optional. */
  locked?: boolean
  /** Options for `select` type. */
  options?: { value: string; label: string }[]
}

export const BUILTIN_FIELDS: RegistrationField[] = [
  { key: 'name', label: 'الاسم', type: 'text', required: true, locked: true },
  { key: 'phone', label: 'رقم الجوال', type: 'phone', required: true, locked: true },
]

export const SUGGESTED_OPTIONAL_FIELDS: RegistrationField[] = [
  { key: 'birthdate', label: 'تاريخ الميلاد', type: 'date', required: false },
  {
    key: 'gender',
    label: 'الجنس',
    type: 'select',
    required: false,
    options: [
      { value: 'male', label: 'ذكر' },
      { value: 'female', label: 'أنثى' },
    ],
  },
  { key: 'email', label: 'البريد الإلكتروني', type: 'email', required: false },
]

export interface CardSettings {
  barcodeType: BarcodeType
  rewardProgram: RewardProgram
  expirationDays: number | null // null = unlimited
  stampLifetimeDays: number | null
  birthdayStamps: number
  welcomeStamps: number
  maxStampsPerDay: number | null
  maxIssuedCards: number | null
  /** Registration form fields. Always includes name + phone (locked). */
  registrationFields: RegistrationField[]
}

/** Per-template lifecycle notification trigger. Stored in the
 *  `notifications` JSON column on the server. Each trigger has a
 *  switch and two localised messages; the dispatcher picks the one
 *  that matches the recipient customer's `locale`. */
export interface NotificationTrigger {
  enabled: boolean
  message_ar: string
  message_en: string
}

/** Canonical list of trigger keys — mirrors
 *  `CardTemplate::NOTIFICATION_TRIGGERS` on the backend. Keep the
 *  two in sync when adding a new trigger. */
export type NotificationTriggerKey =
  | 'welcome'
  | 'halfway'
  | 'almost_there'
  | 'reward_ready'
  | 'redeemed'

export type CardNotifications = Record<NotificationTriggerKey, NotificationTrigger>

export interface CardTemplate {
  id: string
  tenantId: number
  /** Public short alphanumeric slug used in /c/:slug links. */
  publicSlug?: string
  /** Card name in Arabic. Shown as the pkpass `logoText`, the in-app
   *  card title, and the lock-screen notification title.
   *  NOTE: The English variant lives on `design.nameEn` (inside the
   *  JSON column) so we don't need a schema migration. */
  name: string
  description?: string
  type: CardType
  status: CardStatus
  design: CardDesign
  settings: CardSettings
  rewards: CardReward[]
  /** IDs of branches where this card's geofence notification triggers.
   *  When the customer's iPhone enters one of these locations, Apple
   *  Wallet surfaces the pass on the lock screen with the welcome text
   *  from `Location.message`. Hard-capped at 10 by Apple's spec. */
  locationIds?: number[]
  /** Lifecycle notifications (welcome / almost_there / reward_ready /
   *  redeemed / halfway). Always a full map because the dispatcher
   *  needs every key present with its enable flag — the server
   *  merges stored values with defaults on every read. */
  notifications: CardNotifications
  createdAt: string
  updatedAt: string
}

/** Default Arabic + English labels — used as fallbacks when a tenant
 *  hasn't customised. The English defaults are also offered as
 *  placeholders in the editor so the tenant doesn't have to think them
 *  up from scratch.
 *
 *  NOTE: `title` and `titleEn` are intentionally empty strings — when a
 *  tenant doesn't provide a display title, the wallet pass simply omits
 *  it. They have NO Arabic / English defaults so they don't accidentally
 *  show up on every card. */
export const DEFAULT_LABELS: Required<CardLabels> = {
  title: '',
  titleEn: '',
  stamps: 'الأختام',
  stampsEn: 'Stamps',
  reward: 'المكافأة',
  rewardEn: 'Gift',
  customer: 'العميل',
  customerEn: 'Customer',
}

/**
 * How many gifts the customer can redeem RIGHT NOW. Stamply's redemption
 * model decrements `stamps_count` by `stamps_required` on each redeem,
 * so the running count of unused gifts is just integer division.
 *
 * Mirrors the PHP equivalent in `ApplePassBuilder::computeAvailableGifts`.
 */
export function computeAvailableGifts(
  stampsCount: number,
  stampsRequired: number,
): number {
  if (stampsRequired <= 0) return 0
  return Math.floor(Math.max(0, stampsCount) / stampsRequired)
}

/**
 * Resolve labels with fallback to the default copy. Used by the in-app
 * preview, the public PWA card and the Apple/Google wallet preview
 * mockups. The Apple Wallet pkpass builder has its own resolver in PHP
 * that mirrors this logic.
 */
export function resolveLabels(labels?: CardLabels): Required<CardLabels> {
  // For `title` we DON'T fall back to a default — empty stays empty so
  // the wallet pass can omit the field entirely. For everything else,
  // empty falls back to the matching default Arabic/English string.
  const title = labels?.title?.trim() ?? ''
  const titleEn = labels?.titleEn?.trim() ?? ''
  return {
    // English title falls back to Arabic title if only Arabic is set,
    // so an iPhone in English mode still shows SOMETHING when the
    // tenant only entered the Arabic version.
    title,
    titleEn: titleEn || title,
    stamps: labels?.stamps?.trim() || DEFAULT_LABELS.stamps,
    stampsEn: labels?.stampsEn?.trim() || DEFAULT_LABELS.stampsEn,
    reward: labels?.reward?.trim() || DEFAULT_LABELS.reward,
    rewardEn: labels?.rewardEn?.trim() || DEFAULT_LABELS.rewardEn,
    customer: labels?.customer?.trim() || DEFAULT_LABELS.customer,
    customerEn: labels?.customerEn?.trim() || DEFAULT_LABELS.customerEn,
  }
}

export const DEFAULT_DESIGN: CardDesign = {
  stampsCount: 10,
  activeStampIcon: 'Coffee',
  inactiveStampIcon: 'Coffee',
  colors: {
    background: '#FEF3C7', // amber-100
    foreground: '#78350F', // amber-900
    stampsBackground: '#FCD34D', // amber-300
    activeStamp: '#78350F',
    inactiveStamp: '#FDE68A', // amber-200
  },
  labels: { ...DEFAULT_LABELS },
}

export const DEFAULT_SETTINGS: CardSettings = {
  barcodeType: 'qrcode',
  rewardProgram: 'stamps',
  expirationDays: null,
  stampLifetimeDays: null,
  birthdayStamps: 1,
  welcomeStamps: 0,
  maxStampsPerDay: null,
  maxIssuedCards: null,
  registrationFields: [...BUILTIN_FIELDS],
}

/** Matches `CardTemplate::defaultNotifications()` on the backend —
 *  keep both in sync when adding a new trigger. Used as the seed for
 *  brand-new templates AND as a client-side fallback in case the
 *  server response is missing any key. */
export const DEFAULT_NOTIFICATIONS: CardNotifications = {
  welcome: {
    enabled: true,
    message_ar: 'مرحباً {{customer.first_name}}! اجمع الأختام واحصل على مكافأتك ☕',
    message_en: 'Welcome {{customer.first_name}}! Collect stamps to earn your reward ☕',
  },
  halfway: {
    enabled: false,
    message_ar: 'أنت في منتصف الطريق ✨ باقي {{stamps_remaining}} أختام فقط',
    message_en: "You're halfway there ✨ Only {{stamps_remaining}} stamps to go",
  },
  almost_there: {
    enabled: true,
    message_ar: '☕ باقي لك خطوة واحدة وتحصل على مكافأتك 🎉',
    message_en: '☕ Just one more step to your reward 🎉',
  },
  reward_ready: {
    enabled: true,
    message_ar: '🎁 مبروك! حصلت على مكافأتك. استبدلها الآن',
    message_en: '🎁 Congrats! Your reward is ready. Redeem it now',
  },
  redeemed: {
    enabled: true,
    message_ar: 'شكراً لزيارتك! بطاقتك الجديدة بدأت من جديد ✨',
    message_en: 'Thanks for visiting! Your new card has started ✨',
  },
}

export function createEmptyCardTemplate(name = 'بطاقتي الجديدة'): CardTemplate {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    tenantId: 1,
    name,
    type: 'stamp',
    status: 'draft',
    design: { ...DEFAULT_DESIGN },
    settings: { ...DEFAULT_SETTINGS },
    rewards: [
      { id: crypto.randomUUID(), name: 'قهوة مجانية', stampsRequired: 10 },
    ],
    notifications: structuredClone(DEFAULT_NOTIFICATIONS),
    createdAt: now,
    updatedAt: now,
  }
}
