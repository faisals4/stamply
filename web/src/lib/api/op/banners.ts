import { opApi } from '../../auth/opAuth'

export interface BannerItem {
  id: number
  title: string
  image_url: string | null
  image_path: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export async function listBanners(): Promise<BannerItem[]> {
  const { data } = await opApi.get<{ data: BannerItem[] }>('/op/banners')
  return data.data
}

export async function createBanner(form: FormData): Promise<BannerItem> {
  const { data } = await opApi.post<{ data: BannerItem }>('/op/banners', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}

export async function updateBanner(id: number, form: FormData): Promise<BannerItem> {
  const { data } = await opApi.post<{ data: BannerItem }>(`/op/banners/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}

export async function deleteBanner(id: number): Promise<void> {
  await opApi.delete(`/op/banners/${id}`)
}

export async function toggleBanner(id: number): Promise<BannerItem> {
  const { data } = await opApi.patch<{ data: BannerItem }>(`/op/banners/${id}/toggle`)
  return data.data
}
