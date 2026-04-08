import axios from 'axios'
import { api } from './client'
import type {
  PublicTemplate,
  PublicTemplateOrCatalog,
  IssuedCardView,
  CashierCardView,
  Customer,
  CustomerDetail,
} from '@/types/customer'

/**
 * Public endpoints use a separate axios instance because they must NOT send
 * the merchant's bearer token (they're unauthenticated by design).
 */
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8888/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

export async function getPublicTemplate(
  templateId: string | number,
): Promise<PublicTemplateOrCatalog> {
  const { data } = await publicApi.get<{ data: PublicTemplateOrCatalog }>(
    `/public/cards/${templateId}`,
  )
  const payload = data.data
  // Catalog responses don't have a form — return as-is.
  if (payload.kind === 'catalog') return payload

  // Card responses: ensure the registration form always includes the
  // required name + phone fields. Older templates saved without these still
  // need a working form.
  const tpl = payload as PublicTemplate
  const existing = tpl.settings.registrationFields ?? []
  const hasName = existing.some((f) => f.key === 'name')
  const hasPhone = existing.some((f) => f.key === 'phone')
  const normalized = [...existing]
  if (!hasName) {
    normalized.unshift({ key: 'name', label: 'الاسم', type: 'text', required: true, locked: true })
  }
  if (!hasPhone) {
    normalized.push({ key: 'phone', label: 'رقم الجوال', type: 'phone', required: true, locked: true })
  }
  return { ...tpl, settings: { ...tpl.settings, registrationFields: normalized } }
}

export interface IssueCardInput {
  phone: string
  first_name?: string
  last_name?: string
  email?: string
  birthdate?: string
  source_utm?: string
}

export async function issueCard(
  templateId: string | number,
  input: IssueCardInput,
): Promise<{ serial_number: string; view_url: string }> {
  const { data } = await publicApi.post<{
    data: { serial_number: string; view_url: string }
  }>(`/public/cards/${templateId}/issue`, input)
  return data.data
}

export async function getIssuedCard(serial: string): Promise<IssuedCardView> {
  const { data } = await publicApi.get<{ data: IssuedCardView }>(`/public/issued/${serial}`)
  return data.data
}

/* ─────────────────────────────────────────────────────────────── */
/*  Phone verification (post-signup OTP on /i/:serial)              */
/* ─────────────────────────────────────────────────────────────── */

export interface OtpRequestResult {
  sent: boolean
  expires_in: number
  phone_masked: string
  /** Exposed only in dev when SMS delivery failed. Never in prod. */
  debug_code: string | null
}

export interface OtpVerifyResult {
  verified: boolean
  verified_at: string
  /** Number of customer rows marked verified (cross-tenant). */
  rows_marked: number
}

/** Send a 4-digit SMS code to the phone on the given card. */
export async function requestPhoneOtp(serial: string): Promise<OtpRequestResult> {
  const { data } = await publicApi.post<{ data: OtpRequestResult }>('/public/otp/request', {
    serial,
  })
  return data.data
}

/** Verify the 4-digit code the customer entered. On success the
 *  backend marks every customer row with that phone as verified. */
export async function verifyPhoneOtp(
  serial: string,
  code: string,
): Promise<OtpVerifyResult> {
  const { data } = await publicApi.post<{ data: OtpVerifyResult }>('/public/otp/verify', {
    serial,
    code,
  })
  return data.data
}

export interface WalletAvailability {
  apple: boolean
  google: boolean
  pwa: boolean
  email: boolean
  sms: boolean
}

export async function getWalletAvailability(): Promise<WalletAvailability> {
  const { data } = await publicApi.get<{ data: WalletAvailability }>('/public/wallet/availability')
  return data.data
}

/** Authenticated cashier + admin calls use the main `api` client with token. */

export async function cashierLookup(serial: string): Promise<CashierCardView> {
  const { data } = await api.get<{ data: CashierCardView }>(`/cashier/lookup/${serial}`)
  return data.data
}

export async function giveStamp(serial: string, count = 1): Promise<CashierCardView> {
  const { data } = await api.post<{ data: CashierCardView }>('/cashier/stamps', {
    serial_number: serial,
    count,
  })
  return data.data
}

export async function removeStamp(serial: string, count = 1): Promise<CashierCardView> {
  const { data } = await api.post<{ data: CashierCardView }>('/cashier/stamps/remove', {
    serial_number: serial,
    count,
  })
  return data.data
}

export async function redeemReward(
  serial: string,
  rewardId: number,
): Promise<CashierCardView> {
  const { data } = await api.post<{ data: CashierCardView }>('/cashier/redemptions', {
    serial_number: serial,
    card_reward_id: rewardId,
  })
  return data.data
}

/* ─────────────────────────────────────────────────────────────── */
/*  Apple Wallet announcements                                     */
/* ─────────────────────────────────────────────────────────────── */

export interface AnnounceResult {
  serial_number: string
  message: string
  sent_to_devices: number
}

export interface AnnounceAllResult {
  message: string
  cards_updated: number
  /** The template IDs the broadcast was narrowed to, or `[]` for "all". */
  template_ids?: number[]
}

/**
 * Push a short announcement to a single Apple Wallet pass. The
 * cardholder sees it as a lock-screen notification within seconds.
 */
export async function announceCard(
  serial: string,
  message: string,
): Promise<AnnounceResult> {
  const { data } = await api.post<{ data: AnnounceResult }>(
    `/cashier/cards/${encodeURIComponent(serial)}/announce`,
    { message },
  )
  return data.data
}

/**
 * Broadcast an announcement to every active card in the tenant,
 * optionally narrowed to one or more card templates. Each cardholder
 * gets a personalized lock-screen notification.
 *
 * @param message      Short Arabic/English text, ≤ 500 chars
 * @param templateIds  When provided with ≥1 id, limits the broadcast
 *                     to cardholders of those templates. When empty
 *                     or omitted → every active card in the tenant.
 */
export async function announceAllCards(
  message: string,
  templateIds?: number[],
): Promise<AnnounceAllResult> {
  const { data } = await api.post<{ data: AnnounceAllResult }>(
    '/cashier/cards/announce-all',
    {
      message,
      ...(templateIds && templateIds.length > 0
        ? { template_ids: templateIds }
        : {}),
    },
  )
  return data.data
}

export type CustomerFilter =
  | 'all'
  | 'active'
  | 'active_week'
  | 'inactive'
  | 'new'
  | 'new_month'
  | 'birthday_week'
  | 'birthday_month'

export async function listCustomers(
  search?: string,
  filter?: CustomerFilter,
  page: number = 1,
): Promise<import('@/types/pagination').Paginated<Customer>> {
  const params: Record<string, string | number> = { page }
  if (search) params.q = search
  if (filter && filter !== 'all') params.filter = filter

  const { data } = await api.get<import('@/types/pagination').Paginated<Customer>>(
    '/customers',
    { params },
  )
  return data
}

export interface CardActivityParams {
  page?: number
  per_page?: number
  kind?: 'stamp' | 'redemption'
  from?: string
  to?: string
}

export async function fetchCardActivity(
  customerId: number | string,
  cardId: number | string,
  params: CardActivityParams = {},
): Promise<import('@/types/pagination').Paginated<import('@/types/customer').ActivityEntry>> {
  const { data } = await api.get<
    import('@/types/pagination').Paginated<import('@/types/customer').ActivityEntry>
  >(`/customers/${customerId}/cards/${cardId}/activity`, { params })
  return data
}

export async function getCustomer(id: string | number): Promise<CustomerDetail> {
  const { data } = await api.get<{ data: CustomerDetail }>(`/customers/${id}`)
  return data.data
}

export interface UpdateCustomerInput {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string
  birthdate?: string | null
}

export async function updateCustomer(
  id: string | number,
  input: UpdateCustomerInput,
): Promise<void> {
  await api.put(`/customers/${id}`, input)
}
