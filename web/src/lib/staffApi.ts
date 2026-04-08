import { api } from './api'

export type StaffRole = 'admin' | 'manager' | 'cashier'

export interface StaffLocationRef {
  id: number
  name: string
}

export interface StaffMember {
  id: number
  name: string
  email: string
  role: StaffRole
  locations: StaffLocationRef[]
  created_at: string
  is_self: boolean
}

export interface StaffInput {
  name: string
  email: string
  role: StaffRole
  location_ids?: number[]
  /** Only on create. */
  password?: string
}

export async function listStaff(params?: {
  page?: number
  q?: string
  role?: StaffRole | ''
}): Promise<import('@/types/pagination').Paginated<StaffMember>> {
  const { data } = await api.get<import('@/types/pagination').Paginated<StaffMember>>(
    '/staff',
    {
      params: {
        page: params?.page,
        q: params?.q || undefined,
        role: params?.role || undefined,
      },
    },
  )
  return data
}

export async function createStaff(input: StaffInput): Promise<StaffMember> {
  const { data } = await api.post<{ data: StaffMember }>('/staff', input)
  return data.data
}

export async function getStaff(id: number | string): Promise<StaffMember> {
  const { data } = await api.get<{ data: StaffMember }>(`/staff/${id}`)
  return data.data
}

/**
 * Update user. Pass `password` only when the admin wants to change it —
 * leave undefined to keep the existing password.
 */
export async function updateStaff(
  id: number,
  input: StaffInput,
): Promise<StaffMember> {
  const { data } = await api.put<{ data: StaffMember }>(`/staff/${id}`, input)
  return data.data
}

export async function deleteStaff(id: number): Promise<void> {
  await api.delete(`/staff/${id}`)
}
