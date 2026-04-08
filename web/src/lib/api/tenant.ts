import { api } from './client'

export interface Tenant {
  id: number
  name: string
  subdomain: string
  plan: string
  is_active: boolean
  description: string | null
  logo: string | null // base64 data URL
  created_at: string
}

export interface UpdateTenantInput {
  name: string
  subdomain: string
  description?: string | null
  logo?: string | null // base64 data URL (omit to keep existing)
}

export async function getTenant(): Promise<Tenant> {
  const { data } = await api.get<{ data: Tenant }>('/tenant')
  return data.data
}

export async function updateTenant(input: UpdateTenantInput): Promise<Tenant> {
  const { data } = await api.put<{ data: Tenant }>('/tenant', input)
  return data.data
}

/* ─── Public self-serve signup ─────────────────────────────────── */

export interface SignupInput {
  brand_name: string
  subdomain: string
  name: string
  email: string
  password: string
}

export interface SignupResponse {
  token: string
  user: {
    id: number
    name: string
    email: string
    role: string
    tenant_id: number
  }
  tenant: {
    id: number
    name: string
    subdomain: string
    plan: string
    trial_ends_at: string | null
  }
}

export async function signup(input: SignupInput): Promise<SignupResponse> {
  const { data } = await api.post<SignupResponse>('/signup', input)
  return data
}
