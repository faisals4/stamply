import { api } from './api'

export interface EmailConfig {
  enabled: boolean
  provider: string
  host: string
  port: number
  username: string
  password: string // Masked on GET — send only on change
  encryption: 'tls' | 'ssl' | 'none'
  from_address: string
  from_name: string
  has_password: boolean
}

export interface EmailConfigInput {
  enabled?: boolean
  provider?: string
  host?: string
  port?: number
  username?: string
  password?: string // Leave empty to keep existing
  encryption?: 'tls' | 'ssl' | 'none'
  from_address?: string
  from_name?: string
}

export async function getEmailConfig(): Promise<EmailConfig> {
  const { data } = await api.get<{ data: EmailConfig }>('/integrations/email')
  return data.data
}

export async function updateEmailConfig(patch: EmailConfigInput): Promise<EmailConfig> {
  const { data } = await api.put<{ data: EmailConfig }>('/integrations/email', patch)
  return data.data
}

export interface TestEmailResponse {
  ok: boolean
  message: string
}

export async function sendTestEmail(
  to: string,
  override?: EmailConfigInput,
): Promise<TestEmailResponse> {
  const { data } = await api.post<TestEmailResponse>('/integrations/email/test', {
    to,
    override,
  })
  return data
}

/* ─────────────────────────────────────────────────────────────── */
/*  SMS (Twilio)                                                    */
/* ─────────────────────────────────────────────────────────────── */

export interface SmsConfig {
  enabled: boolean
  provider: string
  account_sid: string
  auth_token: string // Masked on GET — send only on change
  from_number: string
  has_auth_token: boolean
}

export interface SmsConfigInput {
  enabled?: boolean
  provider?: string
  account_sid?: string
  auth_token?: string // Leave empty to keep existing
  from_number?: string
}

export async function getSmsConfig(): Promise<SmsConfig> {
  const { data } = await api.get<{ data: SmsConfig }>('/integrations/sms')
  return data.data
}

export async function updateSmsConfig(patch: SmsConfigInput): Promise<SmsConfig> {
  const { data } = await api.put<{ data: SmsConfig }>('/integrations/sms', patch)
  return data.data
}

export async function sendTestSms(
  to: string,
  override?: SmsConfigInput,
): Promise<TestEmailResponse> {
  const { data } = await api.post<TestEmailResponse>('/integrations/sms/test', {
    to,
    override,
  })
  return data
}

/* ─────────────────────────────────────────────────────────────── */
/*  Push notifications (Web Push / APNs / FCM)                      */
/* ─────────────────────────────────────────────────────────────── */

export interface PushConfig {
  enabled: boolean
  vapid_public_key: string
  vapid_private_key: string // Masked on GET
  vapid_subject: string
  apns_team_id: string
  apns_key_id: string
  apns_bundle_id: string
  has_apns_key: boolean
  fcm_project_id: string
  has_fcm_credentials: boolean
  has_vapid_private_key: boolean
}

export interface PushConfigInput {
  enabled?: boolean
  vapid_public_key?: string
  vapid_private_key?: string // Leave empty to keep existing
  vapid_subject?: string
  apns_team_id?: string
  apns_key_id?: string
  apns_bundle_id?: string
  apns_key?: string
  fcm_project_id?: string
  fcm_service_account?: string
}

export async function getPushConfig(): Promise<PushConfig> {
  const { data } = await api.get<{ data: PushConfig }>('/integrations/push')
  return data.data
}

export async function updatePushConfig(patch: PushConfigInput): Promise<PushConfig> {
  const { data } = await api.put<{ data: PushConfig }>('/integrations/push', patch)
  return data.data
}
