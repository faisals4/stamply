/**
 * Card template types — mirrors `web/src/types/card.ts`.
 * Only `stamp` type is fully implemented in Phase 1.
 */

export type CardType = 'stamp' | 'points' | 'membership' | 'discount' | 'cashback' | 'coupon' | 'multipass' | 'gift';
export type CardStatus = 'draft' | 'active' | 'inactive';
export type BarcodeType = 'pdf417' | 'qrcode';
export type RewardProgram = 'stamps' | 'spend' | 'products' | 'visits';

export interface CardReward {
  id: string;
  name: string;
  stampsRequired: number;
}

export interface CardLabels {
  title?: string;
  titleEn?: string;
  stamps?: string;
  stampsEn?: string;
  reward?: string;
  rewardEn?: string;
  customer?: string;
  customerEn?: string;
}

export interface CardDesign {
  nameEn?: string;
  stampsCount: number;
  activeStampIcon: string;
  inactiveStampIcon: string;
  colors: {
    background: string;
    foreground: string;
    stampsBackground: string;
    activeStamp: string;
    inactiveStamp: string;
  };
  logoUrl?: string;
  backgroundUrl?: string;
  labels?: CardLabels;
}

export interface RegistrationField {
  key: string;
  label: string;
  type: 'text' | 'phone' | 'email' | 'date' | 'select';
  required: boolean;
  locked?: boolean;
  options?: { value: string; label: string }[];
}

export interface CardSettings {
  barcodeType: BarcodeType;
  rewardProgram: RewardProgram;
  expirationDays: number | null;
  stampLifetimeDays: number | null;
  birthdayStamps: number;
  welcomeStamps: number;
  maxStampsPerDay: number | null;
  maxIssuedCards: number | null;
  registrationFields: RegistrationField[];
}

export interface NotificationTrigger {
  enabled: boolean;
  message_ar: string;
  message_en: string;
}

export type NotificationTriggerKey = 'welcome' | 'halfway' | 'almost_there' | 'reward_ready' | 'redeemed';
export type CardNotifications = Record<NotificationTriggerKey, NotificationTrigger>;

export interface CardTemplate {
  id: string;
  tenantId: number;
  publicSlug?: string;
  name: string;
  description?: string;
  type: CardType;
  status: CardStatus;
  design: CardDesign;
  settings: CardSettings;
  rewards: CardReward[];
  locationIds?: number[];
  notifications: CardNotifications;
  createdAt: string;
  updatedAt: string;
}

/* ── Defaults ── */

export const BUILTIN_FIELDS: RegistrationField[] = [
  { key: 'name', label: 'الاسم', type: 'text', required: true, locked: true },
  { key: 'phone', label: 'رقم الجوال', type: 'phone', required: true, locked: true },
];

export const DEFAULT_LABELS: Required<CardLabels> = {
  title: '',
  titleEn: '',
  stamps: 'الأختام',
  stampsEn: 'Stamps',
  reward: 'المكافأة',
  rewardEn: 'Gift',
  customer: 'العميل',
  customerEn: 'Customer',
};

export const DEFAULT_DESIGN: CardDesign = {
  stampsCount: 10,
  activeStampIcon: 'Coffee',
  inactiveStampIcon: 'Coffee',
  colors: {
    background: '#FEF3C7',
    foreground: '#78350F',
    stampsBackground: '#FCD34D',
    activeStamp: '#78350F',
    inactiveStamp: '#FDE68A',
  },
  labels: { ...DEFAULT_LABELS },
};

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
};

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
};

export const NOTIFICATION_TRIGGER_KEYS: NotificationTriggerKey[] = [
  'welcome', 'halfway', 'almost_there', 'reward_ready', 'redeemed',
];

/* ── Color presets (matching web editor) ── */

export const COLOR_PRESETS = [
  { key: 'gold', label: 'ذهبي', labelEn: 'Gold', bg: '#FEF3C7', fg: '#78350F', stampsBg: '#FCD34D', active: '#78350F', inactive: '#FDE68A' },
  { key: 'blue', label: 'أزرق', labelEn: 'Blue', bg: '#DBEAFE', fg: '#1E3A5F', stampsBg: '#93C5FD', active: '#1E3A5F', inactive: '#BFDBFE' },
  { key: 'green', label: 'أخضر', labelEn: 'Green', bg: '#D1FAE5', fg: '#064E3B', stampsBg: '#6EE7B7', active: '#064E3B', inactive: '#A7F3D0' },
  { key: 'pink', label: 'وردي', labelEn: 'Pink', bg: '#FCE7F3', fg: '#831843', stampsBg: '#F9A8D4', active: '#831843', inactive: '#FBCFE8' },
  { key: 'light', label: 'فاتح', labelEn: 'Light', bg: '#F9FAFB', fg: '#111827', stampsBg: '#E5E7EB', active: '#111827', inactive: '#F3F4F6' },
  { key: 'dark', label: 'داكن', labelEn: 'Dark', bg: '#1F2937', fg: '#F9FAFB', stampsBg: '#374151', active: '#F9FAFB', inactive: '#4B5563' },
  { key: 'purple', label: 'بنفسجي', labelEn: 'Purple', bg: '#EDE9FE', fg: '#4C1D95', stampsBg: '#C4B5FD', active: '#4C1D95', inactive: '#DDD6FE' },
  { key: 'red', label: 'أحمر', labelEn: 'Red', bg: '#FEE2E2', fg: '#7F1D1D', stampsBg: '#FCA5A5', active: '#7F1D1D', inactive: '#FECACA' },
] as const;

/* ── API helpers ── */

interface ApiReward {
  id: number | string;
  card_template_id?: number;
  name: string;
  stamps_required: number;
  image_url?: string | null;
}

interface ApiCard {
  id: number | string;
  tenant_id: number;
  public_slug?: string | null;
  name: string;
  description: string | null;
  type: CardTemplate['type'];
  status: CardTemplate['status'];
  design: CardTemplate['design'];
  settings: CardTemplate['settings'];
  rewards?: ApiReward[];
  locations?: { id: number }[];
  notifications?: Partial<CardNotifications> | null;
  created_at: string;
  updated_at: string;
}

function normalizeDesign(raw: Partial<CardDesign> | null | undefined): CardDesign {
  const r = raw ?? {};
  return {
    ...DEFAULT_DESIGN,
    ...r,
    colors: { ...DEFAULT_DESIGN.colors, ...(r.colors ?? {}) },
  };
}

function normalizeSettings(raw: Partial<CardSettings> | null | undefined): CardSettings {
  const r = raw ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...r,
    registrationFields:
      r.registrationFields && r.registrationFields.length > 0
        ? r.registrationFields
        : DEFAULT_SETTINGS.registrationFields,
  };
}

function normalizeNotifications(raw: Partial<CardNotifications> | null | undefined): CardNotifications {
  const out = {} as CardNotifications;
  for (const key of NOTIFICATION_TRIGGER_KEYS) {
    const stored = raw?.[key] as Partial<NotificationTrigger> | undefined;
    const fallback = DEFAULT_NOTIFICATIONS[key];
    out[key] = {
      enabled: stored?.enabled ?? fallback.enabled,
      message_ar: stored?.message_ar ?? fallback.message_ar,
      message_en: stored?.message_en ?? fallback.message_en,
    };
  }
  return out;
}

export function fromApi(api: ApiCard): CardTemplate {
  return {
    id: String(api.id),
    tenantId: api.tenant_id,
    publicSlug: api.public_slug ?? undefined,
    name: api.name,
    description: api.description ?? undefined,
    type: api.type,
    status: api.status,
    design: normalizeDesign(api.design as Partial<CardDesign>),
    settings: normalizeSettings(api.settings as Partial<CardSettings>),
    rewards: (api.rewards ?? []).map<CardReward>((r) => ({
      id: String(r.id),
      name: r.name,
      stampsRequired: r.stamps_required,
    })),
    locationIds: (api.locations ?? []).map((l) => l.id),
    notifications: normalizeNotifications(api.notifications),
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function toApiPayload(card: CardTemplate) {
  return {
    name: card.name,
    description: card.description ?? null,
    type: card.type,
    status: card.status,
    design: card.design,
    settings: card.settings,
    location_ids: card.locationIds ?? [],
    rewards: card.rewards.map((r) => ({
      name: r.name,
      stamps_required: r.stampsRequired,
    })),
    notifications: card.notifications,
  };
}

export function createEmptyCard(name = 'بطاقتي الجديدة'): CardTemplate {
  const now = new Date().toISOString();
  return {
    id: '',
    tenantId: 0,
    name,
    type: 'stamp',
    status: 'draft',
    design: { ...DEFAULT_DESIGN, labels: { ...DEFAULT_LABELS } },
    settings: { ...DEFAULT_SETTINGS, registrationFields: [...BUILTIN_FIELDS] },
    rewards: [{ id: 'new-1', name: 'قهوة مجانية', stampsRequired: 10 }],
    notifications: JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS)),
    createdAt: now,
    updatedAt: now,
  };
}
