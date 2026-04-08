import { api } from './api'
import type { Paginated } from '@/types/pagination'

export interface ReportSummary {
  totals: {
    customers: number
    cards: number
    issued_cards: number
    stamps: number
    redemptions: number
    stamps_today: number
    stamps_week: number
    customers_week: number
  }
  stamps_trend: { date: string; count: number }[]
  customers_trend: { date: string; count: number }[]
  top_cards: {
    id: number
    name: string
    status: string
    issued_count: number
  }[]
}

export async function getReportsSummary(): Promise<ReportSummary> {
  const { data } = await api.get<{ data: ReportSummary }>('/reports/summary')
  return data.data
}

/**
 * Trigger a CSV download. Uses the same axios instance so the bearer token
 * is attached, then converts the blob to an object URL and clicks a hidden
 * anchor — this matches the existing pattern other apps use for downloads.
 */
export async function downloadCsv(
  kind: 'customers' | 'stamps' | 'redemptions',
): Promise<void> {
  const res = await api.get(`/reports/${kind}.csv`, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `stamply-${kind}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/* ──────────────────────────────────────────────────────────────── */
/*  Paginated drill-down report row types + fetchers                 */
/* ──────────────────────────────────────────────────────────────── */

export interface StampReportRow {
  id: number
  count: number
  reason: string
  created_at: string
  customer: { id: number; name: string; phone: string } | null
  card_template: { id: number; name: string } | null
  serial_number: string | null
  given_by: { id: number; name: string } | null
}

export interface RedemptionReportRow {
  id: number
  code: string
  status: string
  used_at: string | null
  created_at: string
  customer: { id: number; name: string; phone: string } | null
  card_template: { id: number; name: string } | null
  reward: { id: number; name: string; stamps_required: number } | null
  used_by: { id: number; name: string } | null
  serial_number: string | null
}

export interface IssuedCardReportRow {
  id: number
  serial_number: string
  stamps_count: number
  status: string
  issued_at: string
  last_used_at: string | null
  customer: { id: number; name: string; phone: string } | null
  card_template: { id: number; name: string; type: string } | null
  totals: {
    stamp_events: number
    redemptions: number
  }
}

export interface StampsReportParams {
  page?: number
  per_page?: number
  q?: string
  reason?: string
  card_template_id?: number
  given_by_user_id?: number
  from?: string
  to?: string
}

export interface RedemptionsReportParams {
  page?: number
  per_page?: number
  q?: string
  card_template_id?: number
  used_by_user_id?: number
  from?: string
  to?: string
}

export interface IssuedCardsReportParams {
  page?: number
  per_page?: number
  q?: string
  card_template_id?: number
  status?: string
  from?: string
  to?: string
}

export async function fetchStampsReport(
  params: StampsReportParams = {},
): Promise<Paginated<StampReportRow>> {
  const { data } = await api.get<Paginated<StampReportRow>>('/reports/stamps', { params })
  return data
}

export async function fetchRedemptionsReport(
  params: RedemptionsReportParams = {},
): Promise<Paginated<RedemptionReportRow>> {
  const { data } = await api.get<Paginated<RedemptionReportRow>>('/reports/redemptions', {
    params,
  })
  return data
}

export async function fetchIssuedCardsReport(
  params: IssuedCardsReportParams = {},
): Promise<Paginated<IssuedCardReportRow>> {
  const { data } = await api.get<Paginated<IssuedCardReportRow>>('/reports/issued-cards', {
    params,
  })
  return data
}
