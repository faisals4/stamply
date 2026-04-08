import { api } from './client'

export interface ProfileData {
  id: number
  name: string
  email: string
  role: string
  permissions: string[]
}

export async function getProfile(): Promise<ProfileData> {
  const { data } = await api.get<{ data: ProfileData }>('/profile')
  return data.data
}

export async function updateProfile(input: {
  name: string
  email: string
}): Promise<ProfileData> {
  const { data } = await api.put<{ data: ProfileData }>('/profile', input)
  return data.data
}

export async function changePassword(input: {
  current_password: string
  new_password: string
  new_password_confirmation: string
}): Promise<void> {
  await api.put('/profile/password', input)
}

export async function logoutAllDevices(): Promise<{ revoked: number }> {
  const { data } = await api.post<{ ok: boolean; revoked: number }>(
    '/profile/logout-all',
  )
  return { revoked: data.revoked }
}
