import { opApi } from '../../auth/opAuth'

/**
 * SaaS-operator-only API for managing platform-level credentials shared
 * across every tenant. Only authenticated users with the `op` Sanctum
 * ability can call these endpoints.
 */

export interface PlatformPushSettings {
  vapid: {
    public_key: string
    private_key_masked: string
    has_private_key: boolean
    subject: string
  }
  apns: {
    team_id: string
    key_id: string
    bundle_id: string
    has_key: boolean
  }
  fcm: {
    project_id: string
    has_service_account: boolean
  }
}

export async function getPlatformPushSettings(): Promise<PlatformPushSettings> {
  const { data } = await opApi.get<{ data: PlatformPushSettings }>('/op/settings/push')
  return data.data
}

export async function generatePlatformVapid(): Promise<
  PlatformPushSettings['vapid']
> {
  const { data } = await opApi.post<{ data: PlatformPushSettings['vapid'] }>(
    '/op/settings/push/vapid/generate',
  )
  return data.data
}

export async function regeneratePlatformVapid(): Promise<
  PlatformPushSettings['vapid'] & { message?: string }
> {
  const { data } = await opApi.post<{
    data: PlatformPushSettings['vapid'] & { message?: string }
  }>('/op/settings/push/vapid/regenerate')
  return data.data
}

export interface UpdateVapidInput {
  vapid_public_key?: string
  vapid_private_key?: string
  vapid_subject?: string
}

export async function updatePlatformVapid(
  patch: UpdateVapidInput,
): Promise<PlatformPushSettings> {
  const { data } = await opApi.put<{ data: PlatformPushSettings }>(
    '/op/settings/push/vapid',
    patch,
  )
  return data.data
}

export interface UpdateApnsInput {
  team_id?: string
  key_id?: string
  bundle_id?: string
  key_body?: string
}

export async function updatePlatformApns(
  patch: UpdateApnsInput,
): Promise<PlatformPushSettings> {
  const { data } = await opApi.put<{ data: PlatformPushSettings }>(
    '/op/settings/push/apns',
    patch,
  )
  return data.data
}

export interface UpdateFcmInput {
  project_id?: string
  service_account?: string
}

export async function updatePlatformFcm(
  patch: UpdateFcmInput,
): Promise<PlatformPushSettings> {
  const { data } = await opApi.put<{ data: PlatformPushSettings }>(
    '/op/settings/push/fcm',
    patch,
  )
  return data.data
}

/* ─────────────────────────────────────────────────────────────── */
/*  Wallet (Apple + Google) — shared across every tenant             */
/* ─────────────────────────────────────────────────────────────── */

/** Inspection of an uploaded Apple Wallet Pass Type ID certificate. */
export interface AppleCertInfo {
  subject_cn: string
  subject_uid: string
  subject_ou: string
  subject_o: string
  issuer_cn: string
  issued_at: number
  expires_at: number
  days_until_expiry: number | null
  is_expired: boolean
  /** True only when the cert was issued by Apple WWDR (real prod cert). */
  is_apple_issued: boolean
  /** True when the uploaded private key matches the certificate. */
  key_matches_cert: boolean
}

export interface PlatformWalletSettings {
  apple: {
    pass_type_id: string
    team_id: string
    organization_name: string
    has_cert: boolean
    has_key: boolean
    has_key_password: boolean
    has_wwdr_cert: boolean
    /** Send APNs to api.sandbox.push.apple.com instead of production. */
    use_sandbox: boolean
    /** Set by `wallet:seed-dev` — pushes are stubbed when true. */
    is_development: boolean
    /** Null until a cert is uploaded. */
    cert_info: AppleCertInfo | null
    /** Real-time updates work only when APP_URL is HTTPS AND a cert is set. */
    auto_update_enabled: boolean
    app_url: string
    app_url_is_https: boolean
    /** Number of devices currently registered for pass updates. */
    installed_devices_count: number
  }
  google: {
    issuer_id: string
    class_prefix: string
    has_service_account: boolean
  }
}

export async function getPlatformWalletSettings(): Promise<PlatformWalletSettings> {
  const { data } = await opApi.get<{ data: PlatformWalletSettings }>(
    '/op/settings/wallet',
  )
  return data.data
}

export interface UpdateAppleWalletInput {
  pass_type_id?: string
  team_id?: string
  organization_name?: string
  cert_pem?: string
  key_pem?: string
  key_password?: string
  wwdr_cert_pem?: string
  /** Toggles APNs host between production and sandbox. */
  use_sandbox?: boolean
}

export async function updatePlatformAppleWallet(
  patch: UpdateAppleWalletInput,
): Promise<PlatformWalletSettings> {
  const { data } = await opApi.put<{ data: PlatformWalletSettings }>(
    '/op/settings/wallet/apple',
    patch,
  )
  return data.data
}

export interface UpdateGoogleWalletInput {
  issuer_id?: string
  class_prefix?: string
  service_account?: string
}

export async function updatePlatformGoogleWallet(
  patch: UpdateGoogleWalletInput,
): Promise<PlatformWalletSettings> {
  const { data } = await opApi.put<{ data: PlatformWalletSettings }>(
    '/op/settings/wallet/google',
    patch,
  )
  return data.data
}

/* ─────────────────────────────────────────────────────────────── */
/*  Platform feature flags                                          */
/* ─────────────────────────────────────────────────────────────── */

export interface PlatformFeatures {
  /** Controls the post-signup OTP block on the public /i/:serial
   *  page. When false, no verification prompt appears. */
  phone_verification: boolean
}

export async function getPlatformFeatures(): Promise<PlatformFeatures> {
  const { data } = await opApi.get<{ data: PlatformFeatures }>(
    '/op/settings/features',
  )
  return data.data
}

export async function updatePlatformFeatures(
  patch: Partial<PlatformFeatures>,
): Promise<PlatformFeatures> {
  const { data } = await opApi.put<{ data: PlatformFeatures }>(
    '/op/settings/features',
    patch,
  )
  return data.data
}

/* ─────────────────────────────────────────────────────────────── */
/*  OTP SMS providers — platform-level (for app OTP only)           */
/* ─────────────────────────────────────────────────────────────── */

export interface OtpSmsProviderConfig {
  messagecentral: {
    enabled: boolean
    customer_id: string
    auth_token_masked: string
    has_auth_token: boolean
  }
  unifonic: {
    enabled: boolean
    app_sid: string
    sender_id: string
  }
  smscountry: {
    enabled: boolean
    auth_key: string
    auth_token_masked: string
    has_auth_token: boolean
    sender_id: string
  }
  twilio: {
    enabled: boolean
    account_sid: string
    auth_token_masked: string
    has_auth_token: boolean
    from_number: string
  }
}

export interface OtpMessageCentralInput {
  enabled?: boolean
  customer_id?: string
  auth_token?: string
}

export interface OtpUnifonicInput {
  enabled?: boolean
  app_sid?: string
  sender_id?: string
}

export interface OtpSmsCountryInput {
  enabled?: boolean
  auth_key?: string
  auth_token?: string
  sender_id?: string
}

export interface OtpTwilioInput {
  enabled?: boolean
  account_sid?: string
  auth_token?: string
  from_number?: string
}

export async function getOtpSmsConfig(): Promise<OtpSmsProviderConfig> {
  const { data } = await opApi.get<{ data: OtpSmsProviderConfig }>('/op/settings/otp-sms')
  return data.data
}

export async function updateOtpMessageCentral(
  patch: OtpMessageCentralInput,
): Promise<OtpSmsProviderConfig> {
  const { data } = await opApi.put<{ data: OtpSmsProviderConfig }>(
    '/op/settings/otp-sms/messagecentral',
    patch,
  )
  return data.data
}

export async function updateOtpUnifonic(
  patch: OtpUnifonicInput,
): Promise<OtpSmsProviderConfig> {
  const { data } = await opApi.put<{ data: OtpSmsProviderConfig }>(
    '/op/settings/otp-sms/unifonic',
    patch,
  )
  return data.data
}

export async function updateOtpSmsCountry(
  patch: OtpSmsCountryInput,
): Promise<OtpSmsProviderConfig> {
  const { data } = await opApi.put<{ data: OtpSmsProviderConfig }>(
    '/op/settings/otp-sms/smscountry',
    patch,
  )
  return data.data
}

export async function updateOtpTwilio(
  patch: OtpTwilioInput,
): Promise<OtpSmsProviderConfig> {
  const { data } = await opApi.put<{ data: OtpSmsProviderConfig }>(
    '/op/settings/otp-sms/twilio',
    patch,
  )
  return data.data
}

export interface OtpSmsTestResponse {
  ok: boolean
  message: string
}

export async function testOtpSms(
  provider: 'messagecentral' | 'unifonic' | 'smscountry' | 'twilio',
  to: string,
): Promise<OtpSmsTestResponse> {
  const { data } = await opApi.post<OtpSmsTestResponse>(
    '/op/settings/otp-sms/test',
    { provider, to },
  )
  return data
}

// ─── Mobile app icon variant ────────────────────────────────────

export type AppIconVariantKey =
  | 'default'
  | 'white'
  | 'ramadan'
  | 'eid'
  | 'national_day'

export interface AppIconVariant {
  key: AppIconVariantKey
  label_ar: string
  label_en: string
  is_default: boolean
  is_active: boolean
}

export interface AppIconConfig {
  active: AppIconVariantKey
  variants: AppIconVariant[]
}

export async function getAppIconConfig(): Promise<AppIconConfig> {
  const { data } = await opApi.get<{ data: AppIconConfig }>(
    '/op/settings/app-icon',
  )
  return data.data
}

export async function setAppIconVariant(
  key: AppIconVariantKey,
): Promise<AppIconConfig> {
  const { data } = await opApi.put<{ data: AppIconConfig }>(
    '/op/settings/app-icon',
    { key },
  )
  return data.data
}
