/**
 * /op Notifications API
 * =====================
 *
 * Client for the operator's push-notification surface:
 *   - listOpNotifications()   → paginated history of every push the
 *                               platform has ever sent (broadcasts +
 *                               automatic event notifications)
 *   - getOpNotification()     → single-notification detail + sample of
 *                               recipient rows
 *   - getOpNotificationStats()→ audience counters for the Send page
 *   - sendOpBroadcast()       → create & dispatch a one-shot broadcast
 *
 * Mirrors api/app/Http/Controllers/Api/Op/NotificationsController.php.
 *
 * Types are intentionally light — they match what the backend returns
 * for the admin UI, not the full Eloquent shape. Add fields here when
 * the backend starts surfacing them, not preemptively.
 */

import { opApi } from '../../auth/opAuth'
import type { Paginated } from '@/types/pagination'

// -----------------------------------------------------------------
// Types
// -----------------------------------------------------------------

export type OpNotificationType = 'broadcast' | 'tenant_broadcast' | 'event'

export type OpNotificationStatus =
  | 'pending'
  | 'sending'
  | 'completed'
  | 'failed'

export type OpBroadcastScope = 'platform' | 'tenant' | 'customer'

export interface OpNotificationListItem {
  id: number
  type: OpNotificationType
  source: string
  tenant_id: number | null
  customer_id: number | null
  issued_card_id: number | null
  title: string
  body: string
  image_url: string | null
  data: Record<string, unknown> | null
  target_count: number
  sent_count: number
  failed_count: number
  status: OpNotificationStatus
  error_message: string | null
  sent_at: string | null
  created_at: string
  tenant: { id: number; name: string } | null
  customer: { id: number; customer_profile_id: number | null } | null
}

export interface OpNotificationRecipient {
  id: number
  sent_notification_id: number
  customer_id: number | null
  push_token_id: number | null
  platform: string | null
  status: 'queued' | 'sent' | 'failed'
  error_message: string | null
  sent_at: string | null
  customer: { id: number; customer_profile_id: number | null } | null
}

export interface OpNotificationDetail {
  notification: OpNotificationListItem & {
    card: { id: number; apple_pass_serial: string | null } | null
    template: { id: number; key: string; name: string } | null
  }
  recipients: OpNotificationRecipient[]
  recipients_truncated: boolean
}

export interface OpNotificationStats {
  platform_tokens: number
  tenant_tokens: number | null
}

// -----------------------------------------------------------------
// History (list + detail)
// -----------------------------------------------------------------

export async function listOpNotifications(params?: {
  page?: number
  per_page?: number
  type?: OpNotificationType
  tenant_id?: number
  status?: OpNotificationStatus
  q?: string
  date_from?: string
  date_to?: string
}): Promise<Paginated<OpNotificationListItem>> {
  const { data } = await opApi.get<Paginated<OpNotificationListItem>>(
    '/op/notifications',
    { params },
  )
  return data
}

export async function getOpNotification(
  id: number | string,
): Promise<OpNotificationDetail> {
  const { data } = await opApi.get<{ data: OpNotificationDetail }>(
    `/op/notifications/${id}`,
  )
  return data.data
}

// -----------------------------------------------------------------
// Stats — audience counters for the Send page
// -----------------------------------------------------------------

export async function getOpNotificationStats(params?: {
  tenant_id?: number
}): Promise<OpNotificationStats> {
  const { data } = await opApi.get<{ data: OpNotificationStats }>(
    '/op/notifications/stats',
    { params },
  )
  return data.data
}

// -----------------------------------------------------------------
// Send broadcast
// -----------------------------------------------------------------

export interface OpBroadcastPayload {
  scope: OpBroadcastScope
  tenant_id?: number
  customer_id?: number
  title: string
  body: string
  image_url?: string
  deep_link?: string
}

export interface OpBroadcastResult {
  id: number
  target_count: number
  sent_count: number
  failed_count: number
  status: OpNotificationStatus
}

export async function sendOpBroadcast(
  payload: OpBroadcastPayload,
): Promise<OpBroadcastResult> {
  const { data } = await opApi.post<{ data: OpBroadcastResult }>(
    '/op/notifications/broadcast',
    payload,
  )
  return data.data
}

// -----------------------------------------------------------------
// Image upload (for broadcast attachment)
// -----------------------------------------------------------------

export interface OpNotificationUploadResult {
  url: string
  path: string
}

/**
 * Upload a notification attachment image. Returns the absolute HTTPS
 * URL the caller should drop into the broadcast's `image_url` field.
 * Accepts PNG/JPG/WEBP up to 5 MB — backend validates and rejects
 * everything else (matches APNs/FCM attachment constraints).
 */
export async function uploadOpNotificationImage(
  file: File,
): Promise<OpNotificationUploadResult> {
  const form = new FormData()
  form.append('image', file)
  // IMPORTANT: do NOT set Content-Type manually. The browser must
  // generate the multipart boundary itself, which only happens when
  // axios leaves the header unset. Passing `undefined` overrides
  // the default `application/json` the opApi instance injects.
  const { data } = await opApi.post<{ data: OpNotificationUploadResult }>(
    '/op/notifications/upload-image',
    form,
    { headers: { 'Content-Type': undefined } },
  )
  return data.data
}
