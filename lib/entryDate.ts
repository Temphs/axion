// Work entries are calendar days. They're stored as UTC midnight of the day and
// every report buckets by UTC date, so the incoming value must be reduced to the
// day the work happened *in Greece* before it's stored. Otherwise a time-tracking
// app that sends "2026-10-01T00:30:00+03:00" would land the entry on 30 Sep.

export const BUSINESS_TIME_ZONE = 'Europe/Athens'

const MIN_YEAR = 2000
const DAY_MS = 86_400_000

// Plain date, or a wall-clock datetime without an offset: the date part is taken as-is.
const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?$/

const athensParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function athensDay(instant: Date): Date {
  const [y, m, d] = athensParts.format(instant).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export type ParsedEntryDate = { date: Date } | { error: string }

// Parses an entry date into UTC midnight of its Greek calendar day, rejecting
// impossible dates, anything before 2000, and anything more than a day ahead.
export function parseEntryDate(input: unknown, now = new Date()): ParsedEntryDate {
  if (typeof input !== 'string' || !input.trim()) return { error: 'date is required' }
  const raw = input.trim()

  let day: Date
  const local = LOCAL_RE.exec(raw)
  if (local) {
    const [y, m, d] = [Number(local[1]), Number(local[2]), Number(local[3])]
    day = new Date(Date.UTC(y, m - 1, d))
    // Date.UTC rolls 2026-02-31 over to March; reject instead.
    if (day.getUTCFullYear() !== y || day.getUTCMonth() !== m - 1 || day.getUTCDate() !== d) {
      return { error: `invalid date: ${raw}` }
    }
  } else {
    const instant = new Date(raw)
    if (Number.isNaN(instant.getTime())) return { error: `invalid date: ${raw}` }
    day = athensDay(instant)
  }

  if (day.getUTCFullYear() < MIN_YEAR) return { error: `date must be in ${MIN_YEAR} or later: ${raw}` }
  if (day.getTime() > athensDay(now).getTime() + DAY_MS) return { error: `date is in the future: ${raw}` }
  return { date: day }
}
