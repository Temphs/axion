import { prisma } from '@/lib/db'
import { hashPassword, createSession, passwordProblem } from '@/lib/auth'
import { ok, fail, readJson, MAX_NAME } from '@/lib/api'
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rateLimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  // Self-service registration is open. Each new account gets its own isolated
  // workspace (all domain data is scoped by userId), so a new signup can never
  // see or touch another account's data.

  // Rate limit: slows down mass account creation and probing which emails are registered.
  const limited = rateLimit(`signup-ip:${clientIp(request)}`, 5, 60 * 60_000)
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)

  const body = await readJson<{ email?: string; password?: string; name?: string }>(request)
  if (!body) return fail('Invalid JSON body')

  const email = body.email?.toString().trim().toLowerCase()
  const password = body.password
  const name = body.name?.toString().trim() || null

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return fail('A valid email is required')
  const problem = passwordProblem(password)
  if (problem) return fail(problem)
  if (name && name.length > MAX_NAME) return fail('Name is too long')

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return fail('An account with this email already exists', 409)

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(password as string), name },
  })

  await createSession(user.id)

  return ok(
    { user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt } },
    { status: 201 }
  )
}
