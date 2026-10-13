import { prisma } from '@/lib/db'
import { ok, fail, readJson, authed } from '@/lib/api'
import { destroySession, verifyPassword, PASSWORD_MAX } from '@/lib/auth'
import { rateLimit, tooManyRequests } from '@/lib/rateLimit'

// Account profile. The email is the login identifier and is not editable here;
// changing it would need a verification flow.
export async function GET() {
  const { user, res } = await authed()
  if (res) return res

  const [employeeCount, clientCount, entryCount] = await Promise.all([
    prisma.employee.count({ where: { userId: user.id } }),
    prisma.client.count({ where: { userId: user.id } }),
    prisma.workEntry.count({ where: { userId: user.id } }),
  ])

  return ok({
    account: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      employeeCount,
      clientCount,
      entryCount,
    },
  })
}

export async function PATCH(request: Request) {
  const { user, res } = await authed()
  if (res) return res

  const body = await readJson<{ name?: string | null }>(request)
  if (!body) return fail('Invalid JSON body')

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const name = body.name?.toString().trim() || null
    if (name && name.length > 120) return fail('Name is too long')
    data.name = name
  }
  if (Object.keys(data).length === 0) return fail('Nothing to update')

  const updated = await prisma.user.update({ where: { id: user.id }, data })
  return ok({ account: { id: updated.id, email: updated.email, name: updated.name } })
}

// Permanently deletes the account and everything in it (GDPR erasure). Needs
// the current password, so a hijacked session alone can't wipe a workspace.
export async function DELETE(request: Request) {
  const { user, res } = await authed()
  if (res) return res

  const limited = rateLimit(`account-delete:${user.id}`, 5, 15 * 60_000)
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)

  const body = await readJson<{ password?: string }>(request)
  const password = body?.password
  if (typeof password !== 'string' || !password || password.length > PASSWORD_MAX) {
    return fail('Password is required', 400)
  }

  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
  if (!record || !(await verifyPassword(password, record.passwordHash))) {
    return fail('Password is incorrect', 403)
  }

  // Every table cascades from User, but WorkEntry → Employee/Client is
  // RESTRICT, so entries go first to keep the cascade order-independent.
  await prisma.$transaction([
    prisma.workEntry.deleteMany({ where: { userId: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ])
  await destroySession()

  return ok({ deleted: true })
}
