// Fixed-window in-memory rate limiter. Per-instance only: on serverless this
// bounds each warm instance rather than the global rate, which is sufficient
// as abuse damping for expensive endpoints (AADE sync). Swap for a shared
// store (Redis/Turso) if hard global limits become necessary.

type Window = { count: number; resetAt: number }

const windows = new Map<string, Window>()

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number }

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const current = windows.get(key)

  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    // Opportunistic cleanup so the map can't grow unbounded.
    if (windows.size > 10_000) {
      for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k)
    }
    return { ok: true }
  }

  if (current.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) }
  }

  current.count++
  return { ok: true }
}

// Best-effort client IP for rate-limit keys. On Vercel the first
// x-forwarded-for hop is set by the platform and can't be spoofed by the client.
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

// 429 response with Retry-After, for a limit that was hit.
export function tooManyRequests(retryAfterSeconds: number, message = 'Too many attempts — try again later'): Response {
  return Response.json({ error: message }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } })
}
