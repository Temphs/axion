// Browser-side reporting for the admin console. No cookies, no storage, no
// identifiers: errors and page views go to our own endpoints, and nothing is
// sent when the browser asks not to be tracked.

const MAX_REPORTS_PER_PAGE = 5
const reported = new Set<string>()

function send(path: string, body: unknown): void {
  try {
    const payload = JSON.stringify(body)
    if (navigator.sendBeacon?.(path, payload)) return
    void fetch(path, { method: 'POST', body: payload, keepalive: true }).catch(() => {})
  } catch {
    // Reporting must never break the page.
  }
}

// Noise that says nothing about our code: extensions, cross-origin scripts
// with no details, and a harmless browser layout warning.
function isNoise(message: string, source?: string): boolean {
  return (
    !message ||
    message === 'Script error.' ||
    /ResizeObserver loop/.test(message) ||
    /^(chrome|moz|safari)-extension:/.test(source ?? '')
  )
}

export function reportClientError(error: unknown, kind: 'window' | 'unhandledrejection' | 'boundary', source?: string): void {
  const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error')
  // Server-rendering errors reach the browser with only a digest; the server
  // already recorded the real one.
  if ('digest' in err && (err as { digest?: string }).digest) return
  if (isNoise(err.message, source)) return
  const key = `${kind}:${err.message}`
  if (reported.has(key) || reported.size >= MAX_REPORTS_PER_PAGE) return
  reported.add(key)
  send('/api/telemetry/error', {
    kind,
    message: err.message,
    stack: err.stack ?? null,
    route: window.location.pathname,
  })
}

function trackingAllowed(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  return nav.doNotTrack !== '1' && nav.globalPrivacyControl !== true
}

let firstView = true

export function trackPageView(url: string): void {
  if (!trackingAllowed()) return
  let path = url
  try {
    path = new URL(url, window.location.origin).pathname
  } catch {
    return
  }
  // The referrer only means something for the page the visitor landed on.
  const referrer = firstView ? document.referrer : ''
  firstView = false
  send('/api/telemetry/view', { path, referrer })
}
