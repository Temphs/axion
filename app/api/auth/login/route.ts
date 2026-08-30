import { prisma } from '@/lib/db'
import { verifyPassword, createSession } from '@/lib/auth'
import { ok, fail, readJson, clientIp, tooManyRequests } from '@/lib/api'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(request: Request) {
  const body = await readJson<{ email?: string; password?: string }>(request)
  if (!body) return fail('Invalid JSON body')

  const email = body.email?.trim().toLowerCase()
  const password = body.password
  if (!email || !password) return fail('Email and password are required')

  // Two windows: one per account so a single mailbox can't be ground through a
  // password list, one per source address so a bot can't spread the same
  // attempt across many accounts. Deployed behind Vercel this is per warm
  // instance, which damps an attack rather than hard-capping it — enough while
  // the login page is the only thing standing between the internet and a
  // client's payroll figures.
  const ip = clientIp(request)
  for (const key of [`login:email:${email}`, `login:ip:${ip}`]) {
    const limited = rateLimit(key, 10, 15 * 60_000)
    if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return fail('Invalid email or password', 401)
  }

  await createSession(user.id)

  return ok({
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
  })
}
