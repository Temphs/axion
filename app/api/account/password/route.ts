import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { ok, fail, readJson, authed, tooManyRequests } from '@/lib/api'
import { rateLimit } from '@/lib/rateLimit'

const SESSION_COOKIE = 'axion_session'

// Changes the password after re-verifying the current one, then signs out every
// other session so a stolen cookie can't outlive the change.
export async function POST(request: Request) {
  const { user, res } = await authed()
  if (res) return res

  const limited = rateLimit(`password-change:${user.id}`, 5, 15 * 60_000)
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)

  const body = await readJson<{ currentPassword?: string; newPassword?: string }>(request)
  if (!body) return fail('Invalid JSON body')
  if (!body.currentPassword || !body.newPassword) return fail('Απαιτείται ο τρέχων και ο νέος κωδικός')
  if (body.newPassword.length < 8) return fail('Ο νέος κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες')
  if (body.newPassword === body.currentPassword) return fail('Ο νέος κωδικός πρέπει να διαφέρει από τον τρέχοντα')

  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
  if (!record) return fail('Unauthorized', 401)
  if (!(await verifyPassword(body.currentPassword, record.passwordHash))) {
    return fail('Ο τρέχων κωδικός δεν είναι σωστός', 403)
  }

  const currentToken = (await cookies()).get(SESSION_COOKIE)?.value ?? ''
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.newPassword) } }),
    prisma.session.deleteMany({ where: { userId: user.id, token: { not: currentToken } } }),
  ])

  return ok({ changed: true })
}
