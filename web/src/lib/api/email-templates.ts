import { api } from './client'

export interface EmailTemplateListItem {
  id: number
  key: string
  name: string
  description: string
  icon: string
  subject: string
  is_enabled: boolean
  updated_at: string
}

export interface EmailTemplate extends EmailTemplateListItem {
  html: string
  variables: Record<string, string>
  default_subject: string
  default_html: string
}

export async function listEmailTemplates(): Promise<EmailTemplateListItem[]> {
  const { data } = await api.get<{ data: EmailTemplateListItem[] }>('/email-templates')
  return data.data
}

export async function getEmailTemplate(key: string): Promise<EmailTemplate> {
  const { data } = await api.get<{ data: EmailTemplate }>(`/email-templates/${key}`)
  return data.data
}

export interface UpdateTemplateInput {
  subject: string
  html: string
  is_enabled?: boolean
}

export async function updateEmailTemplate(
  key: string,
  input: UpdateTemplateInput,
): Promise<EmailTemplate> {
  const { data } = await api.put<{ data: EmailTemplate }>(`/email-templates/${key}`, input)
  return data.data
}

export async function resetEmailTemplate(key: string): Promise<EmailTemplate> {
  const { data } = await api.post<{ data: EmailTemplate }>(`/email-templates/${key}/reset`)
  return data.data
}

/** Toggle just the enabled flag. Keeps the rest of the template untouched. */
export async function toggleEmailTemplate(
  key: string,
  isEnabled: boolean,
  current: { subject: string; html: string },
): Promise<EmailTemplate> {
  // Backend PUT requires subject + html in the payload (both have
  // `required` validation), so we re-send the current values alongside
  // the new is_enabled flag.
  const { data } = await api.put<{ data: EmailTemplate }>(`/email-templates/${key}`, {
    subject: current.subject,
    html: current.html,
    is_enabled: isEnabled,
  })
  return data.data
}

export async function testEmailTemplate(
  key: string,
  to: string,
  override?: { subject?: string; html?: string },
): Promise<{ ok: boolean; message: string }> {
  const { data } = await api.post<{ ok: boolean; message: string }>(
    `/email-templates/${key}/test`,
    { to, ...override },
  )
  return data
}
