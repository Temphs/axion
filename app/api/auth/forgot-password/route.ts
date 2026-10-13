import { after } from 'next/server'
import { ok, fail, readJson } from '@/lib/api'
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rateLimit'
import { requestPasswordReset } from '@/lib/passwordReset'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HOUR_MS = 60 * 60_000

// Always answers the same way, whether or not the email has an account. The
// lookup and the email are sent after the response, so response time doesn't
// reveal it either.
export async function POST(request: Request) {
  const byIp = rateLimit(`forgot-ip:${clientIp(request)}`, 10, HOUR_MS)
  if (!byIp.ok) return tooManyRequests(byIp.retryAfterSeconds)

  const body = await readJson<{ email?: string; lang?: string }>(request)
  if (!body) return fail('Invalid JSON body')

  const email = body.email?.toString().trim().toLowerCase()
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return fail('A valid email is required')
  const lang = body.lang === 'en' ? 'en' : 'el'

  // Per-address cap stops the endpoint being used to flood someone's inbox.
  // Over the cap we still answer "sent", so it isn't an existence oracle.
  if (rateLimit(`forgot-email:${email}`, 3, HOUR_MS).ok) {
    after(() =>
      requestPasswordReset(email, lang).catch((err) =>
        console.error('Password reset request failed', err instanceof Error ? err.name : 'UnknownError')
      )
    )
  }

  return ok({ ok: true })
}
