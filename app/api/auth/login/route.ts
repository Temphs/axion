import { prisma } from '@/lib/db'
import { verifyPassword, createSession } from '@/lib/auth'
import { ok, fail, readJson } from '@/lib/api'

export async function POST(request: Request) {
  const body = await readJson<{ email?: string; password?: string }>(request)
  if (!body) return fail('Invalid JSON body')

  const email = body.email?.trim().toLowerCase()
  const password = body.password
  if (!email || !password) return fail('Email and password are required')

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return fail('Invalid email or password', 401)
  }

  await createSession(user.id)

  return ok({
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
  })
}
