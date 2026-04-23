/**
 * Centralised date/time formatting for the whole app.
 *
 * We standardise on the Arabic (`ar-SA`) locale but force Western digits
 * (`latn` numbering system) because the designs throughout Stamply show
 * Western digits in every numeric field — mixing Arabic-Indic digits in
 * dates would look inconsistent. Passing `numberingSystem: 'latn'` keeps the
 * month/day names in Arabic while the digits stay `0-9`.
 */

type DateInput = string | number | Date | null | undefined

const LOCALE = 'ar-SA-u-nu-latn-ca-gregory'

/** "25/4/2026، 02:30" — date + time, short form. */
export function formatDateTime(input: DateInput, fallback = '—'): string {
  if (!input) return fallback
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return fallback
  return d.toLocaleString(LOCALE, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/** "25/4/2026، 02:30:45" — date + time with seconds (for logs). */
export function formatDateTimeFull(input: DateInput, fallback = '—'): string {
  if (!input) return fallback
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return fallback
  return d.toLocaleString(LOCALE, {
    dateStyle: 'short',
    timeStyle: 'medium',
  })
}

/** "25/4/2026" — date only, short form. */
export function formatDate(input: DateInput, fallback = '—'): string {
  if (!input) return fallback
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return fallback
  return d.toLocaleDateString(LOCALE, { dateStyle: 'short' })
}

/** "02:30" — time only, short form. */
export function formatTime(input: DateInput, fallback = '—'): string {
  if (!input) return fallback
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return fallback
  return d.toLocaleTimeString(LOCALE, { timeStyle: 'short' })
}

/* ──────────────────────────────────────────────────────────── */
/*  Quick date-range presets used by report filter pills         */
/* ──────────────────────────────────────────────────────────── */

export type DateRange = 'all' | 'today' | 'week' | 'month' | 'custom'

export const DATE_RANGE_PRESETS: { key: DateRange; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'today', label: 'اليوم' },
  { key: 'week', label: 'هذا الأسبوع' },
  { key: 'month', label: 'خلال 30 يوم' },
]

/**
 * Resolve a preset into concrete `from`/`to` YYYY-MM-DD strings that can be
 * sent to any list endpoint accepting date filters. `all` and `custom`
 * clear the filter.
 */
export function rangeToDates(range: DateRange): { from: string; to: string } {
  if (range === 'all' || range === 'custom') return { from: '', to: '' }
  const now = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  if (range === 'today') {
    const today = iso(now)
    return { from: today, to: today }
  }
  if (range === 'week') {
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    return { from: iso(start), to: iso(now) }
  }
  // month: last 30 days
  const start = new Date(now)
  start.setDate(start.getDate() - 29)
  return { from: iso(start), to: iso(now) }
}

/** Safely parse a `?range=` query string value, falling back to `'all'`. */
export function parseRangeParam(raw: string | null): DateRange {
  const VALID: DateRange[] = ['all', 'today', 'week', 'month']
  return raw && VALID.includes(raw as DateRange) ? (raw as DateRange) : 'all'
}
