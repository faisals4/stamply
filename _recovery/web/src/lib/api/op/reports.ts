import { opApi } from '../../auth/opAuth'
import type { PaginationMeta } from '@/types/pagination'

export interface OtpSmsLogItem {
  id: number
  phone: string
  phone_masked: string
  country_code: string | null
  context: string
  device_type: string | null
  provider: string
  status: string
  error_message: string | null
  customer_profile_id: number | null
  created_at: string
}

export interface OtpSmsLogsResponse {
  data: OtpSmsLogItem[]
  meta: PaginationMeta
  counts: {
    total: number
    sent: number
    verified: number
    failed: number
  }
  filters: {
    country_codes: string[]
  }
}

export async function listOtpSmsLogs(params?: {
  page?: number
  q?: string
  status?: string
  provider?: string
  country_code?: string
  from?: string
  to?: string
}): Promise<OtpSmsLogsResponse> {
  const { data } = await opApi.get<OtpSmsLogsResponse>('/op/reports/otp-sms-logs', { params })
  return data
}
