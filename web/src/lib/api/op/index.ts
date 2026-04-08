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
