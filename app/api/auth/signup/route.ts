import { prisma } from '@/lib/db'
import { hashPassword, createSession } from '@/lib/auth'
import { ok, fail, readJson, clientIp, tooManyRequests } from '@/lib/api'
import { rateLimit } from '@/lib/rateLimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  // Self-service registration is open. Each new account gets its own isolated
  // workspace (all domain data is scoped by userId), so a new signup can never
  // see or touch another account's data. It is still capped per source address:
  // without this anyone who finds the URL can mint accounts in a loop.
  const limited = rateLimit(`signup:ip:${clientIp(request)}`, 5, 60 * 60_000)
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)

  const body = await readJson<{ email?: string; password?: string; name?: string }>(request)
  if (!body) return fail('Invalid JSON body')

  const email = body.email?.trim().toLowerCase()
  const password = body.password
  const name = body.name?.trim() || null

  if (!email || !EMAIL_RE.test(email)) return fail('A valid email is required')
  if (!password || password.length < 8) return fail('Password must be at least 8 characters')

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return fail('An account with this email already exists', 409)

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(password), name },
  })

  await createSession(user.id)

  return ok(
    { user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt } },
    { status: 201 }
  )
}
