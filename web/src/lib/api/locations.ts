import { api } from './client'

export interface Location {
  id: number
  tenant_id: number
  name: string
  address: string | null
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
  address?: string
  lat?: number | null
  lng?: number | null
  geofence_radius_m?: number
  message?: string
  is_active?: boolean
}

export async function listLocations(): Promise<Location[]> {
  const { data } = await api.get<{ data: Location[] }>('/locations')
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
