import { api } from './client'

export interface SmsTemplateListItem {
  id: number
  key: string
  name: string
  description: string
  icon: string
  body: string
  is_enabled: boolean
  updated_at: string
}

export interface SmsTemplate extends SmsTemplateListItem {
  variables: Record<string, string>
  default_body: string
}

export async function listSmsTemplates(): Promise<SmsTemplateListItem[]> {
  const { data } = await api.get<{ data: SmsTemplateListItem[] }>('/sms-templates')
  return data.data
}

export async function getSmsTemplate(key: string): Promise<SmsTemplate> {
  const { data } = await api.get<{ data: SmsTemplate }>(`/sms-templates/${key}`)
  return data.data
}

export interface UpdateSmsTemplateInput {
  body: string
  is_enabled?: boolean
}

export async function updateSmsTemplate(
  key: string,
  input: UpdateSmsTemplateInput,
): Promise<SmsTemplate> {
  const { data } = await api.put<{ data: SmsTemplate }>(`/sms-templates/${key}`, input)
  return data.data
}

export async function resetSmsTemplate(key: string): Promise<SmsTemplate> {
  const { data } = await api.post<{ data: SmsTemplate }>(`/sms-templates/${key}/reset`)
  return data.data
}

export async function testSmsTemplate(
  key: string,
  to: string,
  override?: { body?: string },
): Promise<{ ok: boolean; message: string }> {
  const { data } = await api.post<{ ok: boolean; message: string }>(
    `/sms-templates/${key}/test`,
    { to, ...override },
  )
  return data
}

/** Toggle helper — resends the current body so the PUT validation passes. */
export async function toggleSmsTemplate(
  key: string,
  isEnabled: boolean,
  currentBody: string,
): Promise<SmsTemplate> {
  const { data } = await api.put<{ data: SmsTemplate }>(`/sms-templates/${key}`, {
    body: currentBody,
    is_enabled: isEnabled,
  })
  return data.data
}
