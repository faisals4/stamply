import { api } from './client'

export type MessageChannel = 'email' | 'sms' | 'push' | 'wallet'
export type MessageStatus = 'draft' | 'sending' | 'sent' | 'failed'
export type MessageAudience = 'all' | 'inactive'

export interface BroadcastMessage {
  id: number
  channel: MessageChannel
  subject: string | null
  body: string
  audience: MessageAudience
  audience_meta: { inactive_days?: number } | null
  status: MessageStatus
  recipients_count: number
  sent_count: number
  failed_count: number
  sent_at: string | null
  created_at: string
  creator: { id: number; name: string } | null
}

export interface BroadcastInput {
  channel: MessageChannel
  audience: MessageAudience
  audience_meta?: { inactive_days?: number }
  subject?: string
  body: string
}

export async function listMessages(
  params: { page?: number; q?: string; channel?: string; status?: string } = {},
): Promise<import('@/types/pagination').Paginated<BroadcastMessage>> {
  const { data } = await api.get<import('@/types/pagination').Paginated<BroadcastMessage>>(
    '/messages',
    { params },
  )
  return data
}

export async function getMessage(id: number | string): Promise<BroadcastMessage> {
  const { data } = await api.get<{ data: BroadcastMessage }>(`/messages/${id}`)
  return data.data
}

export async function createMessage(input: BroadcastInput): Promise<BroadcastMessage> {
  const { data } = await api.post<{ data: BroadcastMessage }>('/messages', input)
  return data.data
}

/**
 * Update a draft message. Backend only allows this when status === 'draft' —
 * once a broadcast has been sent it becomes immutable.
 */
export async function updateMessage(
  id: number | string,
  input: BroadcastInput,
): Promise<BroadcastMessage> {
  const { data } = await api.put<{ data: BroadcastMessage }>(`/messages/${id}`, input)
  return data.data
}

export async function sendMessage(id: number | string): Promise<BroadcastMessage> {
  const { data } = await api.post<{ data: BroadcastMessage }>(`/messages/${id}/send`)
  return data.data
}

/**
 * Delete a draft broadcast. The backend refuses to delete anything
 * whose status isn't `draft`, so the history of sent/failed campaigns
 * stays intact.
 */
export async function deleteMessage(id: number | string): Promise<void> {
  await api.delete(`/messages/${id}`)
}

/* ────────────────────────────────────────────────────────────── */
/*  Reach stats                                                   */
/* ────────────────────────────────────────────────────────────── */

export interface ReachSummary {
  total_customers: number
  email: { reachable: number; percentage: number }
  sms: { reachable: number; percentage: number }
  push: { reachable: number; percentage: number }
  wallet: { reachable: number; percentage: number }
}

export async function getMessagesReach(): Promise<ReachSummary> {
  const { data } = await api.get<{ data: ReachSummary }>('/messages/reach')
  return data.data
}

export type ReachChannel = 'email' | 'sms' | 'push' | 'wallet'

/** A single push device on a reachable customer (push channel only). */
export interface ReachableDevice {
  id: number
  platform: 'web' | 'ios' | 'android'
  user_agent: string | null
  language: string | null
  subscribed_at: string
  last_seen_at: string | null
}

/** An installed Apple Wallet pass (wallet channel only). */
export interface InstalledCard {
  id: number
  serial_number: string
  stamps_count: number
  devices_count: number
}

export interface ReachableCustomer {
  id: number
  name: string
  phone: string
  email: string | null
  cards_count: number
  last_activity_at: string | null
  /** Populated only when the channel query is `push`. */
  devices?: ReachableDevice[]
  /** Populated only when the channel query is `wallet`. */
  installed_cards?: InstalledCard[]
}

export async function listReachableCustomers(
  channel: ReachChannel,
  params: { page?: number } = {},
): Promise<import('@/types/pagination').Paginated<ReachableCustomer>> {
  const { data } = await api.get<import('@/types/pagination').Paginated<ReachableCustomer>>(
    `/messages/reach/${channel}`,
    { params },
  )
  return data
}
