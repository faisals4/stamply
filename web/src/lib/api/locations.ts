import { api } from './client'

export interface Location {
  id: number
  tenant_id: number
  name: string
  name_en: string | null
  address: string | null
  address_en: string | null
  lat: number | null
  lng: number | null
  geofence_radius_m: number
  message: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LocationInput {
  name: string
  name_en?: string | null
  address?: string | null
  address_en?: string | null
  lat?: number | null
  lng?: number | null
  geofence_radius_m?: number
  message?: string
  is_active?: boolean
}

export async function listLocations(params?: {
  page?: number
  q?: string
}): Promise<import('@/types/pagination').Paginated<Location>> {
  const { data } = await api.get<import('@/types/pagination').Paginated<Location>>(
    '/locations',
    { params },
  )
  return data
}

export async function getLocation(id: number | string): Promise<Location> {
  const { data } = await api.get<{ data: Location }>(`/locations/${id}`)
  return data.data
}

export async function createLocation(input: LocationInput): Promise<Location> {
  const { data } = await api.post<{ data: Location }>('/locations', input)
  return data.data
}

export async function updateLocation(id: number, input: LocationInput): Promise<Location> {
  const { data } = await api.put<{ data: Location }>(`/locations/${id}`, input)
  return data.data
}

export async function deleteLocation(id: number): Promise<void> {
  await api.delete(`/locations/${id}`)
}
