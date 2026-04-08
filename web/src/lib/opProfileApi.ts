import { opApi } from './opAuth'

export interface OpProfileData {
  id: number
  name: string
  email: string
  role: string
}

export async function getOpProfile(): Promise<OpProfileData> {
  const { data } = await opApi.get<{ data: OpProfileData }>('/op/profile')
  return data.data
}

export async function updateOpProfile(input: {
  name: string
  email: string
}): Promise<OpProfileData> {
  const { data } = await opApi.put<{ data: OpProfileData }>('/op/profile', input)
  return data.data
}

export async function changeOpPassword(input: {
  current_password: string
  new_password: string
  new_password_confirmation: string
}): Promise<void> {
  await opApi.put('/op/profile/password', input)
}

export async function opLogoutAllDevices(): Promise<{ revoked: number }> {
  const { data } = await opApi.post<{ ok: boolean; revoked: number }>(
    '/op/profile/logout-all',
  )
  return { revoked: data.revoked }
}
