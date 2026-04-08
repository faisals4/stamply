import { api } from './client'
import type { StaffRole } from './staff'

export interface PermissionGroup {
  label: string
  permissions: Record<string, string>
}

export interface PermissionsPayload {
  catalog: Record<string, PermissionGroup>
  roles: Record<StaffRole, string[]>
}

export async function getPermissions(): Promise<PermissionsPayload> {
  const { data } = await api.get<{ data: PermissionsPayload }>('/permissions')
  return data.data
}

export async function saveRolePermissions(
  role: StaffRole,
  permissions: string[],
): Promise<{ role: StaffRole; permissions: string[] }> {
  const { data } = await api.put<{
    data: { role: StaffRole; permissions: string[] }
  }>(`/permissions/${role}`, { permissions })
  return data.data
}
