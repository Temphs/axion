// Date/time text that renders identically on the server (UTC on Vercel) and in
// the browser (the visitor's own zone). Pages are rendered on the server and
// then hydrated; if the two produce different text React throws a hydration
// error (#418). So every human-readable date names its time zone explicitly:
// timestamps are shown in Greek time, stored calendar days (UTC midnight) as
// the day they represent.

export const APP_TIME_ZONE = 'Europe/Athens'

type DateInput = string | number | Date

const cache = new Map<string, Intl.DateTimeFormat>()
function fmt(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = locale + JSON.stringify(options)
  let f = cache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options)
    cache.set(key, f)
  }
  return f
}

// A moment in time (createdAt, lastSyncedAt…), e.g. "14/10/2026, 10:22".
export function formatDateTime(value: DateInput, locale = 'el-GR'): string {
  return fmt(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: APP_TIME_ZONE }).format(new Date(value))
}

// Just the clock time of a moment, e.g. "10:22".
export function formatTime(value: DateInput, locale = 'el-GR'): string {
  return fmt(locale, { hour: '2-digit', minute: '2-digit', timeZone: APP_TIME_ZONE }).format(new Date(value))
}

// The calendar date of a moment, in Greece.
export function formatDate(value: DateInput, locale = 'el-GR'): string {
  return fmt(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: APP_TIME_ZONE }).format(new Date(value))
}

// A stored calendar day (work entries, invoice dates: UTC midnight).
export function formatDay(value: DateInput, locale = 'el-GR'): string {
  return fmt(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
}

// Today's date in Greece as YYYY-MM-DD: the same on server and phone.
export function todayInGreece(now: DateInput = new Date()): string {
  return fmt('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: APP_TIME_ZONE }).format(new Date(now))
}
