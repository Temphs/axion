import { prisma } from '@/lib/db'
import { ok, fail, readJson, authed } from '@/lib/api'

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
