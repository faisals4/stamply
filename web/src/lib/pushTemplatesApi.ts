import { api } from './api'

/**
 * Push notification template CRUD — mirrors smsTemplatesApi but with a
 * `title` field (notification heading) and an optional `url` (deep link
 * target when the customer taps the notification).
 */

export interface PushTemplateListItem {
  id: number
  key: string
  name: string
  description: string
  icon: string
  title: string
  body: string
  url: string | null
  is_enabled: boolean
  updated_at: string
}

export interface PushTemplate extends PushTemplateListItem {
  variables: Record<string, string>
  default_title: string
  default_body: string
  default_url: string
}

export async function listPushTemplates(): Promise<PushTemplateListItem[]> {
  const { data } = await api.get<{ data: PushTemplateListItem[] }>('/push-templates')
  return data.data
}

export async function getPushTemplate(key: string): Promise<PushTemplate> {
  const { data } = await api.get<{ data: PushTemplate }>(`/push-templates/${key}`)
  return data.data
}

export interface UpdatePushTemplateInput {
  title: string
  body: string
  url?: string | null
  is_enabled?: boolean
}

export async function updatePushTemplate(
  key: string,
  input: UpdatePushTemplateInput,
): Promise<PushTemplate> {
  const { data } = await api.put<{ data: PushTemplate }>(`/push-templates/${key}`, input)
  return data.data
}

export async function resetPushTemplate(key: string): Promise<PushTemplate> {
  const { data } = await api.post<{ data: PushTemplate }>(`/push-templates/${key}/reset`)
  return data.data
}

export async function testPushTemplate(
  key: string,
  override?: { title?: string; body?: string; url?: string; customer_id?: number },
): Promise<{ ok: boolean; delivered?: number; message: string }> {
  const { data } = await api.post<{
    ok: boolean
    delivered?: number
    message: string
  }>(`/push-templates/${key}/test`, override ?? {})
  return data
}

/** Toggle helper — resends the current fields so the PUT validation passes. */
export async function togglePushTemplate(
  key: string,
  isEnabled: boolean,
  current: { title: string; body: string; url: string | null },
): Promise<PushTemplate> {
  const { data } = await api.put<{ data: PushTemplate }>(`/push-templates/${key}`, {
    title: current.title,
    body: current.body,
    url: current.url ?? undefined,
    is_enabled: isEnabled,
  })
  return data.data
}
