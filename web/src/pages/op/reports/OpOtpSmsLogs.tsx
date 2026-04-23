import { useState } from 'react'
import { useLocation } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import { Pagination } from '@/components/ui/pagination'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { formatDateTimeFull } from '@/lib/utils/date'
import {
  Search,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Send,
  Clock,
  Smartphone,
  Monitor,
  ExternalLink,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { BackButton } from '@/components/ui/back-button'
import { listOtpSmsLogs, type OtpSmsLogItem, type OtpSmsLogsResponse } from '@/lib/api/op/reports'
import { cn } from '@/lib/utils'

/* ── Country code → flag + name mapping ── */
const COUNTRY_MAP: Record<string, { flag: string; name: string }> = {
  '966': { flag: '🇸🇦', name: 'السعودية' },
  '971': { flag: '🇦🇪', name: 'الإمارات' },
  '965': { flag: '🇰🇼', name: 'الكويت' },
  '973': { flag: '🇧🇭', name: 'البحرين' },
  '974': { flag: '🇶🇦', name: 'قطر' },
  '968': { flag: '🇴🇲', name: 'عمان' },
  '20':  { flag: '🇪🇬', name: 'مصر' },
  '962': { flag: '🇯🇴', name: 'الأردن' },
  '961': { flag: '🇱🇧', name: 'لبنان' },
  '964': { flag: '🇮🇶', name: 'العراق' },
  '967': { flag: '🇾🇪', name: 'اليمن' },
  '249': { flag: '🇸🇩', name: 'السودان' },
  '212': { flag: '🇲🇦', name: 'المغرب' },
  '216': { flag: '🇹🇳', name: 'تونس' },
  '213': { flag: '🇩🇿', name: 'الجزائر' },
  '90':  { flag: '🇹🇷', name: 'تركيا' },
  '92':  { flag: '🇵🇰', name: 'باكستان' },
  '91':  { flag: '🇮🇳', name: 'الهند' },
  '1':   { flag: '🇺🇸', name: 'أمريكا' },
  '44':  { flag: '🇬🇧', name: 'بريطانيا' },
  '49':  { flag: '🇩🇪', name: 'ألمانيا' },
  '33':  { flag: '🇫🇷', name: 'فرنسا' },
  '63':  { flag: '🇵🇭', name: 'الفلبين' },
  '62':  { flag: '🇮🇩', name: 'إندونيسيا' },
  '60':  { flag: '🇲🇾', name: 'ماليزيا' },
}

function countryDisplay(code: string | null) {
  if (!code) return '—'
  const c = COUNTRY_MAP[code]
  return c ? `${c.flag} ${c.name}` : `+${code}`
}

function countryDropdownLabel(code: string) {
  const c = COUNTRY_MAP[code]
  return c ? `${c.flag} ${c.name} (+${code})` : `+${code}`
}

/* ── Status badges ── */
const STATUS_FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'sent', label: 'مُرسل' },
  { key: 'verified', label: 'تم التحقق' },
  { key: 'failed', label: 'فشل' },
] as const

const PROVIDER_FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'messagecentral', label: 'MessageCentral' },
  { key: 'unifonic', label: 'Unifonic' },
  { key: 'smscountry', label: 'SMSCountry' },
  { key: 'twilio', label: 'Twilio' },
  { key: 'stub', label: 'محاكاة' },
] as const

function statusBadge(status: string) {
  switch (status) {
    case 'verified':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          <CheckCircle2 className="w-3 h-3" /> تم التحقق
        </span>
      )
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-700">
          <XCircle className="w-3 h-3" /> فشل
        </span>
      )
    case 'sent':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-700">
          <Send className="w-3 h-3" /> مُرسل
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Clock className="w-3 h-3" /> {status}
        </span>
      )
  }
}

function providerLabel(provider: string) {
  switch (provider) {
    case 'messagecentral': return 'MessageCentral'
    case 'unifonic': return 'Unifonic'
    case 'smscountry': return 'SMSCountry'
    case 'twilio': return 'Twilio'
    case 'stub': return 'محاكاة'
    case 'test': return 'اختبار'
    default: return provider
  }
}

function contextLabel(context: string) {
  switch (context) {
    case 'mobile_login': return 'تسجيل دخول'
    case 'signup': return 'تسجيل جديد'
    default: return context
  }
}

function deviceIcon(device: string | null) {
  if (!device) return null
  switch (device) {
    case 'iOS':
    case 'Android':
    case 'Mobile App':
      return <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
    case 'Web':
      return <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
    default:
      return null
  }
}

const today = () => new Date().toISOString().slice(0, 10)

export default function OpOtpSmsLogsPage() {
  const [, setLocation] = useLocation()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [providerFilter, setProviderFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuery<OtpSmsLogsResponse>({
    queryKey: ['op-otp-sms-logs', debouncedSearch, statusFilter, providerFilter, countryFilter, dateFrom, dateTo, page],
    queryFn: () =>
      listOtpSmsLogs({
        page,
        q: debouncedSearch || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        provider: providerFilter === 'all' ? undefined : providerFilter,
        country_code: countryFilter === 'all' ? undefined : countryFilter,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      }),
  })

  const logs = data?.data ?? []
  const meta = data?.meta
  const counts = data?.counts
  const availableCountries = data?.filters?.country_codes ?? []

  const formatDateLabel = (d: string) => {
    if (!d) return ''
    const parts = d.split('-')
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  return (
    <div>
      <BackButton href="/op/reports" label="التقارير" className="mb-3" />

      <PageHeader
        icon={<MessageSquare />}
        title="سجل إرسال OTP"
        subtitle="جميع رسائل OTP المُرسلة من المنصة مع حالة كل رسالة ومقدم الخدمة"
      />

      {/* Search */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث برقم الجوال..."
            className="ps-9"
          />
        </div>

        {/* Date range */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">من:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          />
          <span className="text-xs text-muted-foreground">إلى:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          />
          {(dateFrom !== today() || dateTo !== today()) && (
            <button
              onClick={() => { setDateFrom(today()); setDateTo(today()); setPage(1) }}
              className="text-xs text-primary hover:underline"
            >
              اليوم
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">الحالة:</span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setStatusFilter(f.key); setPage(1) }}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium border transition',
                statusFilter === f.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/40',
              )}
            >
              {f.label}
            </button>
          ))}

          <span className="text-xs text-muted-foreground self-center ms-3">المزوّد:</span>
          {PROVIDER_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setProviderFilter(f.key); setPage(1) }}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium border transition',
                providerFilter === f.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/40',
              )}
            >
              {f.label}
            </button>
          ))}

          {/* Country dropdown */}
          {availableCountries.length > 0 && (
            <>
              <span className="text-xs text-muted-foreground self-center ms-3">الدولة:</span>
              <select
                value={countryFilter}
                onChange={(e) => { setCountryFilter(e.target.value); setPage(1) }}
                className="h-7 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="all">الكل</option>
                {availableCountries.map((cc) => (
                  <option key={cc} value={cc}>{countryDropdownLabel(cc)}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {counts && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-xs text-muted-foreground">
            {dateFrom === dateTo && dateFrom
              ? formatDateLabel(dateFrom)
              : dateFrom && dateTo
                ? `${formatDateLabel(dateFrom)} — ${formatDateLabel(dateTo)}`
                : 'كل الأوقات'}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium text-foreground">
            الكل <span className="font-bold">{counts.total}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-[12px] font-medium text-blue-700">
            <Send className="w-3 h-3" /> إرسال <span className="font-bold">{counts.sent}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[12px] font-medium text-emerald-700">
            <CheckCircle2 className="w-3 h-3" /> تحقق <span className="font-bold">{counts.verified}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-[12px] font-medium text-red-700">
            <XCircle className="w-3 h-3" /> فشل <span className="font-bold">{counts.failed}</span>
          </span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading && (
          <div className="p-8 text-center text-muted-foreground">جارٍ التحميل...</div>
        )}
        {!isLoading && logs.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            لا توجد سجلات
          </div>
        )}
        {logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-start px-4 py-3 font-medium">التاريخ</th>
                  <th className="text-start px-4 py-3 font-medium">الرقم</th>
                  <th className="text-start px-4 py-3 font-medium">الدولة</th>
                  <th className="text-start px-4 py-3 font-medium">الجهاز</th>
                  <th className="text-start px-4 py-3 font-medium">النوع</th>
                  <th className="text-start px-4 py-3 font-medium">المزوّد</th>
                  <th className="text-start px-4 py-3 font-medium">الحالة</th>
                  <th className="text-start px-4 py-3 font-medium">الخطأ</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTimeFull(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {log.customer_profile_id ? (
                        <button
                          onClick={() => setLocation(`/op/customers/${log.customer_profile_id}`)}
                          className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                          dir="ltr"
                          title={log.phone}
                        >
                          {log.phone}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="font-mono text-xs" dir="ltr" title={log.phone}>
                          {log.phone}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {countryDisplay(log.country_code)}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        {deviceIcon(log.device_type)}
                        {log.device_type ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {contextLabel(log.context)}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium">
                      {providerLabel(log.provider)}
                    </td>
                    <td className="px-4 py-3">
                      {statusBadge(log.status)}
                    </td>
                    <td className="px-4 py-3 text-xs text-red-600 max-w-[200px] truncate" title={log.error_message ?? ''}>
                      {log.error_message ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meta && <Pagination meta={meta} onPageChange={setPage} />}
    </div>
  )
}
