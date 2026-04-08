import { api } from './client'

export type AutomationStatus = 'draft' | 'active' | 'paused'
export type AutomationTrigger = 'card_issued' | 'birthday' | 'inactive' | 'stamp_given'
export type AutomationStepType =
  | 'send_sms'
  | 'send_email'
  | 'send_push'
  | 'add_stamps'
  | 'wait'
  | 'condition'
  | 'stop'

export interface AutomationStep {
  id: string
  type: AutomationStepType
  config: Record<string, unknown>
}

export interface AutomationFlow {
  steps: AutomationStep[]
}

export interface Automation {
  id: number
  name: string
  description: string | null
  status: AutomationStatus
  trigger_type: AutomationTrigger
  trigger_config: Record<string, unknown>
  flow_json?: AutomationFlow
  total_runs: number
  last_run_at: string | null
  runs_count: number
  created_at: string
  creator: { id: number; name: string } | null
}

export interface AutomationPreset {
  key: string
  name: string
  description: string
  icon: string
  trigger_type: AutomationTrigger
  trigger_config: Record<string, unknown>
  flow_json: AutomationFlow
}

export interface AutomationRunLog {
  step_index: number
  step_type: string
  action: string
  result: 'success' | 'skipped' | 'failed'
  error_message: string | null
  executed_at: string | null
}

export interface AutomationRun {
  id: number
  status: 'queued' | 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled'
  current_step_index: number
  wait_until: string | null
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  customer: { id: number; name: string; phone: string } | null
  logs: AutomationRunLog[]
}

export interface AutomationInput {
  name: string
  description?: string | null
  status?: AutomationStatus
  trigger_type: AutomationTrigger
  trigger_config?: Record<string, unknown>
  flow_json: AutomationFlow
}

export async function listAutomations(params?: {
  page?: number
  trigger_type?: AutomationTrigger
  status?: AutomationStatus
}): Promise<import('@/types/pagination').Paginated<Automation>> {
  const { data } = await api.get<import('@/types/pagination').Paginated<Automation>>(
    '/automations',
    { params },
  )
  return data
}

export async function listPresets(): Promise<AutomationPreset[]> {
  const { data } = await api.get<{ data: AutomationPreset[] }>('/automations/presets')
  return data.data
}

export async function getAutomation(id: number | string): Promise<Automation> {
  const { data } = await api.get<{ data: Automation }>(`/automations/${id}`)
  return data.data
}

export async function createAutomation(input: AutomationInput): Promise<Automation> {
  const { data } = await api.post<{ data: Automation }>('/automations', input)
  return data.data
}

export async function createFromPreset(key: string): Promise<Automation> {
  const { data } = await api.post<{ data: Automation }>('/automations/from-preset', { key })
  return data.data
}

export async function updateAutomation(
  id: number | string,
  input: AutomationInput,
): Promise<Automation> {
  const { data } = await api.put<{ data: Automation }>(`/automations/${id}`, input)
  return data.data
}

export async function setAutomationStatus(
  id: number | string,
  status: AutomationStatus,
): Promise<Automation> {
  const { data } = await api.patch<{ data: Automation }>(`/automations/${id}/status`, { status })
  return data.data
}

export async function deleteAutomation(id: number | string): Promise<void> {
  await api.delete(`/automations/${id}`)
}

export async function getAutomationRuns(
  id: number | string,
  params: { page?: number; status?: string; from?: string; to?: string } = {},
): Promise<import('@/types/pagination').Paginated<AutomationRun>> {
  const { data } = await api.get<import('@/types/pagination').Paginated<AutomationRun>>(
    `/automations/${id}/runs`,
    { params },
  )
  return data
}

export async function testAutomation(
  id: number | string,
  customerId?: number,
): Promise<{ run_id: number; status: string }> {
  const { data } = await api.post<{ data: { run_id: number; status: string } }>(
    `/automations/${id}/test`,
    customerId ? { customer_id: customerId } : {},
  )
  return data.data
}
