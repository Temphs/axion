import { createHash } from 'node:crypto'
import { prisma } from '@/lib/db'
import { verifyPassword, createSession, PASSWORD_MAX } from '@/lib/auth'
import { ok, fail, readJson } from '@/lib/api'
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rateLimit'

const WINDOW_MS = 15 * 60_000

export async function POST(request: Request) {
  const body = await readJson<{ email?: string; password?: string }>(request)
  if (!body) return fail('Invalid JSON body')

  const email = body.email?.toString().trim().toLowerCase()
  const password = body.password
  if (!email || !password || typeof password !== 'string') return fail('Email and password are required')

  // Two limits: per IP (one attacker, many accounts) and per email (many IPs, one account).
  const byIp = rateLimit(`login-ip:${clientIp(request)}`, 20, WINDOW_MS)
  if (!byIp.ok) return tooManyRequests(byIp.retryAfterSeconds)
  const byEmail = rateLimit(`login-email:${email}`, 10, WINDOW_MS)
  if (!byEmail.ok) return tooManyRequests(byEmail.retryAfterSeconds)

  // No stored password is this long, and scrypt on huge input is wasted CPU.
  if (password.length > PASSWORD_MAX) return fail('Invalid email or password', 401)

  const user = await prisma.user.findUnique({ where: { email } })
  const passwordOk = !!user && (await verifyPassword(password, user.passwordHash))
  if (!user || !passwordOk) {
    // The user sees one message either way (no account enumeration), but the
    // server log says which it was. "no_account" for someone who signed up
    // before means this deployment is reading a different database.
    console.warn('login_failed', { reason: user ? 'bad_password' : 'no_account', email: emailTag(email) })
    return fail('Invalid email or password', 401)
  }

  await createSession(user.id)

  return ok({
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
  })
}

// Short, stable pseudonym for an email in logs: lets failures for the same
// address be correlated without writing the address itself to the log.
function emailTag(email: string): string {
  return createHash('sha256').update(email).digest('hex').slice(0, 12)
}
