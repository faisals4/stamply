import { opApi, type PlatformAdmin } from '../../auth/opAuth'

/* ─── Auth ─────────────────────────────────────────────────────── */

export async function opLogin(
  email: string,
  password: string,
): Promise<{ token: string; admin: PlatformAdmin }> {
  const { data } = await opApi.post<{ token: string; admin: PlatformAdmin }>(
    '/op/login',
    { email, password },
  )
  return data
}

/* ─── Dashboard ────────────────────────────────────────────────── */

export interface OpDashboardStats {
  tenants_total: number
  tenants_active: number
  tenants_new_month: number
  users_total: number
  card_templates_total: number
  active_card_templates: number
  customers_total: number
  issued_cards_total: number
  stamps_total: number
  stamps_today: number
  redemptions_total: number
  active_tenants_week: number
}

export async function getOpDashboardStats(): Promise<OpDashboardStats> {
  const { data } = await opApi.get<{ data: OpDashboardStats }>('/op/dashboard/stats')
  return data.data
}

/* ─── Tenants ──────────────────────────────────────────────────── */

export interface OpTenantListItem {
  id: number
  name: string
  subdomain: string
  plan: string
  is_active: boolean
  trial_ends_at: string | null
  users_count: number
  card_templates_count: number
  logo: string | null
  created_at: string
}

export interface OpTenantDetail extends OpTenantListItem {
  description: string | null
  stats: {
    users: number
    card_templates: number
    customers: number
    issued_cards: number
    stamps_given: number
  }
  users: Array<{
    id: number
    name: string
    email: string
    role: string
    created_at: string
  }>
}

export async function listOpTenants(params?: {
  page?: number
  q?: string
  status?: 'active' | 'inactive'
}): Promise<import('@/types/pagination').Paginated<OpTenantListItem>> {
  const { data } = await opApi.get<import('@/types/pagination').Paginated<OpTenantListItem>>(
    '/op/tenants',
    { params },
  )
  return data
}

export async function getOpTenant(id: number | string): Promise<OpTenantDetail> {
  const { data } = await opApi.get<{ data: OpTenantDetail }>(`/op/tenants/${id}`)
  return data.data
}

export async function toggleOpTenant(id: number | string): Promise<{ is_active: boolean }> {
  const { data } = await opApi.patch<{ data: { is_active: boolean } }>(
    `/op/tenants/${id}/toggle`,
  )
  return data.data
}

export async function deleteOpTenant(id: number | string): Promise<void> {
  await opApi.delete(`/op/tenants/${id}`)
}

export async function impersonateTenant(id: number | string): Promise<{ token: string; user: { id: number; name: string; email: string; role: string; tenant_id: number; tenant_name: string } }> {
  const { data } = await opApi.post<{ token: string; user: any }>(`/op/tenants/${id}/impersonate`)
  return data
}

/* ─── Customers (cross-tenant) ────────────────────────────────── */

export interface OpCustomerListItem {
  id: number
  phone: string
  first_name: string | null
  last_name: string | null
  full_name: string
  email: string | null
  phone_verified_at: string | null
  gender: string | null
  tenants_count: number
  issued_cards_count: number
  created_at: string
}

export interface OpCustomerDetail extends OpCustomerListItem {
  birthdate: string | null
  locked_fields: string[]
  stats: {
    tenants: number
    issued_cards: number
    stamps: number
    redemptions: number
    push_tokens: number
  }
  tenants: Array<{
    id: number
    name: string | null
    customer_id: number
    locale: string
    source_utm: string | null
    last_activity_at: string | null
    created_at: string
    issued_cards_count: number
  }>
  favorites: Array<{
    id: number
    tenant_id: number
    tenant_name: string
    created_at: string
  }>
  /** @deprecated Use listOpCustomerCards() instead — paginated server-side */
  issued_cards?: Array<{
    id: number
    serial_number: string
    card_name: string | null
    tenant_id: number
    stamps_count: number
    status: string
    issued_at: string | null
    installed_at: string | null
    installed_via: string | null
    last_used_at: string | null
    expires_at: string | null
  }>
}

export async function listOpCustomers(params?: {
  page?: number
  q?: string
}): Promise<import('@/types/pagination').Paginated<OpCustomerListItem>> {
  const { data } = await opApi.get('/op/customers', { params })
  return data
}

export async function getOpCustomer(id: number | string): Promise<OpCustomerDetail> {
  const { data } = await opApi.get<{ data: OpCustomerDetail }>(`/op/customers/${id}`)
  return data.data
}

export async function listOpCustomerCards(
  id: number | string,
  params?: { page?: number },
): Promise<import('@/types/pagination').Paginated<OpCustomerDetail['issued_cards'][0]>> {
  const { data } = await opApi.get(`/op/customers/${id}/cards`, {
    params: { ...params, per_page: 10 },
  })
  return data
}

/* ─── Subscriptions ───────────────────────────────────────────── */

export interface OpSubscriptionListItem {
  id: number
  name: string
  subdomain: string
  plan: string
  plan_name_ar: string
  is_active: boolean
  subscription_status: 'active' | 'expired' | 'trial' | 'expiring_soon' | 'disabled'
  trial_ends_at: string | null
  subscription_starts_at: string | null
  subscription_ends_at: string | null
  plan_price: string
  plan_interval: string
  days_remaining: number
  created_at: string
}

export interface OpSubscriptionDetail extends OpSubscriptionListItem {
  plan_name_en: string
  subscription_notes: string | null
  plan_details: {
    monthly_price: string
    yearly_price: string
    max_cards: number
    max_locations: number
    max_users: number
    features: Record<string, unknown> | null
  } | null
  usage: {
    cards: number
    locations: number
    users: number
  }
}

export interface SubscriptionLogItem {
  id: number
  tenant_id: number
  action: string
  plan_from: string | null
  plan_to: string | null
  starts_at: string | null
  ends_at: string | null
  amount: string
  payment_method: string
  notes: string | null
  performer?: { id: number; name: string } | null
  created_at: string
}

export async function listOpSubscriptions(params?: {
  page?: number
  q?: string
  plan?: string
  status?: string
}): Promise<import('@/types/pagination').Paginated<OpSubscriptionListItem>> {
  const { data } = await opApi.get('/op/subscriptions', { params })
  return data
}

export async function getOpSubscription(tenantId: number | string): Promise<OpSubscriptionDetail> {
  const { data } = await opApi.get<{ data: OpSubscriptionDetail }>(`/op/subscriptions/${tenantId}`)
  return data.data
}

export async function updateOpSubscription(
  tenantId: number | string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { data } = await opApi.put(`/op/subscriptions/${tenantId}`, payload)
  return data.data
}

export async function extendOpSubscription(
  tenantId: number | string,
  payload: { months?: number; days?: number; amount?: number; payment_method?: string; notes?: string },
): Promise<{ subscription_ends_at: string; days_remaining: number }> {
  const { data } = await opApi.post<{ data: { subscription_ends_at: string; days_remaining: number } }>(
    `/op/subscriptions/${tenantId}/extend`,
    payload,
  )
  return data.data
}

export async function getOpSubscriptionLogs(
  tenantId: number | string,
  params?: { page?: number },
): Promise<import('@/types/pagination').Paginated<SubscriptionLogItem>> {
  const { data } = await opApi.get(`/op/subscriptions/${tenantId}/logs`, { params })
  return data
}

export async function deleteOpSubscriptionLog(
  tenantId: number | string,
  logId: number | string,
): Promise<{ ok: boolean }> {
  const { data } = await opApi.delete(`/op/subscriptions/${tenantId}/logs/${logId}`)
  return data
}

/* ─── Plans ───────────────────────────────────────────────────── */

export interface PlanItem {
  id: number
  slug: string
  name_ar: string
  name_en: string
  monthly_price: string
  yearly_price: string
  max_cards: number
  max_locations: number
  max_users: number
  trial_days: number
  features: Record<string, unknown> | null
  is_active: boolean
  sort_order: number
}

export async function listOpPlans(): Promise<PlanItem[]> {
  const { data } = await opApi.get<{ data: PlanItem[] }>('/op/plans')
  return data.data
}

export async function updateOpPlan(
  id: number | string,
  payload: Partial<PlanItem>,
): Promise<PlanItem> {
  const { data } = await opApi.put<{ data: PlanItem }>(`/op/plans/${id}`, payload)
  return data.data
}
