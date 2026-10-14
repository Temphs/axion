import { createHash } from 'node:crypto'

// Pure helpers that decide what monitoring is allowed to store. Everything
// that reaches the database goes through here first: paths lose query strings,
// tokens and record ids; messages lose emails and anything token-like.

const ID_SEGMENT = /^(c[a-z0-9]{20,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{16,}|\d{3,}|[A-Za-z0-9_-]{24,})$/

// "/el/t/abc…xyz?x=1" → "/el/t/[token]"; "/el/dashboard/employees/cmv5…" →
// "/el/dashboard/employees/[id]". Never keeps a query string or fragment.
export function normalizePath(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) return '/'
  let path = raw
  try {
    // Accept full URLs too (window.location.href, router URLs).
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname
  } catch {
    return '/'
  }
  path = path.split(/[?#]/)[0] || '/'
  const segments = path.split('/').map((seg, i, all) => {
    if (!seg) return seg
    // Entry-link and terminal API tokens are credentials.
    if (all[i - 1] === 't' || all[i - 1] === 'terminal') return '[token]'
    return ID_SEGMENT.test(seg) ? '[id]' : seg
  })
  const out = segments.join('/') || '/'
  return out.length > 200 ? out.slice(0, 200) : out
}

// Removes personal data and secrets from free text (error messages, stacks).
export function scrubText(text: string, max: number): string {
  const cleaned = text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b(Bearer|token|key|password|secret)(\s*[=:]\s*|\s+)\S+/gi, '$1$2[redacted]')
    .replace(/axion_(sk|session)_?[A-Za-z0-9_-]*/g, '[secret]')
    .replace(/\/t\/[A-Za-z0-9_-]{8,}/g, '/t/[token]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[token]')
  return cleaned.length > max ? cleaned.slice(0, max) + '…' : cleaned
}

// The first stack frame that points into the app, without line/column, so a
// redeploy that shifts line numbers still groups with the same error.
export function topFrame(stack: string | null | undefined): string {
  if (!stack) return ''
  for (const line of stack.split('\n').slice(1)) {
    const frame = line.trim()
    if (!frame.startsWith('at ')) continue
    if (/node_modules|node:internal|<anonymous>/.test(frame)) continue
    return frame.replace(/:\d+:\d+\)?$/, '').replace(/\?[^\s)]*/, '')
  }
  return ''
}

// Same error, same row: digits are folded so "id 123" and "id 456" group.
export function errorFingerprint(input: {
  source: string
  kind?: string | null
  route?: string | null
  message: string
  stack?: string | null
}): string {
  const message = input.message.replace(/\d+/g, '0').slice(0, 300)
  return createHash('sha256')
    .update([input.source, input.kind ?? '', input.route ?? '', message, topFrame(input.stack)].join('|'))
    .digest('hex')
    .slice(0, 32)
}

const BOT_UA = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|curl|wget|python|node-fetch|go-http|axios|httpclient|monitor|uptime/i

export function isBot(userAgent: string | null | undefined): boolean {
  return !userAgent || BOT_UA.test(userAgent)
}

export function deviceOf(userAgent: string | null | undefined): 'mobile' | 'desktop' {
  return userAgent && /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent) ? 'mobile' : 'desktop'
}

// Only the host of an external referrer ("google.com"); own-site and invalid
// referrers become "" (direct / internal).
export function referrerHost(referrer: unknown, ownHost: string | null): string {
  if (typeof referrer !== 'string' || !referrer) return ''
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase()
    if (!host || (ownHost && host === ownHost.replace(/^www\./, '').split(':')[0].toLowerCase())) return ''
    return host.slice(0, 100)
  } catch {
    return ''
  }
}

// Next.js uses thrown values for redirect()/notFound(); those are control flow, not errors.
export function isFrameworkSignal(err: unknown): boolean {
  const digest = typeof err === 'object' && err !== null && 'digest' in err ? String((err as { digest: unknown }).digest) : ''
  const message = err instanceof Error ? err.message : String(err)
  return /^(NEXT_|DYNAMIC_SERVER_USAGE)/.test(digest) || /NEXT_(REDIRECT|NOT_FOUND|HTTP_ERROR_FALLBACK)/.test(message)
}
