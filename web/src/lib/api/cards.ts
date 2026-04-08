import type {
  CardTemplate,
  CardReward,
  CardDesign,
  CardSettings,
  CardNotifications,
  NotificationTriggerKey,
  NotificationTrigger,
} from '@/types/card'
import { DEFAULT_DESIGN, DEFAULT_SETTINGS, DEFAULT_NOTIFICATIONS } from '@/types/card'
import { api } from './client'

/**
 * Laravel returns snake_case at the top level and nested JSON blobs (design,
 * settings) as-is. These helpers translate between the wire format and the
 * camelCase `CardTemplate` type the UI uses.
 */

interface ApiReward {
  id: number | string
  card_template_id?: number
  name: string
  stamps_required: number
  image_url?: string | null
}

interface ApiCard {
  id: number | string
  tenant_id: number
  public_slug?: string | null
  name: string
  description: string | null
  type: CardTemplate['type']
  status: CardTemplate['status']
  design: CardTemplate['design']
  settings: CardTemplate['settings']
  rewards?: ApiReward[]
  /** Returned by the controller when eager-loading the
   *  `card_template_location` pivot. Each entry only carries `id`. */
  locations?: { id: number }[]
  /** Lifecycle notifications — the `show()` controller merges
   *  defaults in so this is always a full trigger map (never
   *  null on existing cards). */
  notifications?: Partial<CardNotifications> | null
  created_at: string
  updated_at: string
}

/**
 * Deep-merge a possibly-partial design blob from the API with the UI defaults
 * so the renderer never crashes on missing nested fields. The DB allows
 * partial JSON (especially when cards are created via the raw API), and the
 * UI assumes every key exists — this normalizer is the safe boundary.
 */
function normalizeDesign(raw: Partial<CardDesign> | null | undefined): CardDesign {
  const r = raw ?? {}
  return {
    ...DEFAULT_DESIGN,
    ...r,
    colors: {
      ...DEFAULT_DESIGN.colors,
      ...(r.colors ?? {}),
    },
  }
}

function normalizeSettings(raw: Partial<CardSettings> | null | undefined): CardSettings {
  const r = raw ?? {}
  return {
    ...DEFAULT_SETTINGS,
    ...r,
    registrationFields:
      r.registrationFields && r.registrationFields.length > 0
        ? r.registrationFields
        : DEFAULT_SETTINGS.registrationFields,
  }
}

/**
 * Guarantees a full trigger map even if the server response is
 * missing a key (e.g. the column was NULL on a pre-migration
 * template). Each missing slot falls back to the bundled defaults
 * so the editor can render every row without optional chaining.
 */
function normalizeNotifications(
  raw: Partial<CardNotifications> | null | undefined,
): CardNotifications {
  const out = {} as CardNotifications
  const keys: NotificationTriggerKey[] = [
    'welcome',
    'halfway',
    'almost_there',
    'reward_ready',
    'redeemed',
  ]
  for (const key of keys) {
    const stored = raw?.[key] as Partial<NotificationTrigger> | undefined
    const fallback = DEFAULT_NOTIFICATIONS[key]
    out[key] = {
      enabled: stored?.enabled ?? fallback.enabled,
      message_ar: stored?.message_ar ?? fallback.message_ar,
      message_en: stored?.message_en ?? fallback.message_en,
    }
  }
  return out
}

function fromApi(api: ApiCard): CardTemplate {
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
  }
}

function toApiPayload(card: CardTemplate) {
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
  }
}

export async function listCardsApi(): Promise<CardTemplate[]> {
  const { data } = await api.get<{ data: ApiCard[] }>('/cards')
  return data.data.map(fromApi)
}

export async function getCardApi(id: string): Promise<CardTemplate> {
  const { data } = await api.get<{ data: ApiCard }>(`/cards/${id}`)
  return fromApi(data.data)
}

export async function createCardApi(card: CardTemplate): Promise<CardTemplate> {
  const { data } = await api.post<{ data: ApiCard }>('/cards', toApiPayload(card))
  return fromApi(data.data)
}

export async function updateCardApi(id: string, card: CardTemplate): Promise<CardTemplate> {
  const { data } = await api.put<{ data: ApiCard }>(`/cards/${id}`, toApiPayload(card))
  return fromApi(data.data)
}

export async function deleteCardApi(id: string): Promise<void> {
  await api.delete(`/cards/${id}`)
}

/* ─────────────────────────────────────────────────────────────── */
/*  Lifecycle notifications (welcome / almost_there / reward_ready) */
/* ─────────────────────────────────────────────────────────────── */

/** Server response shape for GET /cards/{id}/notifications. Mirrors
 *  `CardController::getNotifications` in Laravel — always returns
 *  every known trigger key with defaults merged in, so the editor
 *  can render each row without branching. */
export interface CardNotificationsConfig {
  triggers: CardNotifications
  available: NotificationTriggerKey[]
}

/** Fetch the full lifecycle-notifications config for a card template. */
export async function getCardNotifications(
  cardId: string,
): Promise<CardNotificationsConfig> {
  const { data } = await api.get<{ data: CardNotificationsConfig }>(
    `/cards/${cardId}/notifications`,
  )
  return data.data
}

/** Save the full triggers map. The server drops unknown keys, trims
 *  each message, and hard-caps at 500 chars (Apple Wallet backField
 *  display limit). */
export async function updateCardNotifications(
  cardId: string,
  triggers: CardNotifications,
): Promise<CardNotificationsConfig> {
  const { data } = await api.put<{ data: CardNotificationsConfig }>(
    `/cards/${cardId}/notifications`,
    { triggers },
  )
  return data.data
}
