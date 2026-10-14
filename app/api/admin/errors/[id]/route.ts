import { prisma } from '@/lib/db'
import { ok, fail, readJson, isNotFound } from '@/lib/api'
import { adminApi } from '@/lib/admin/auth'

const STATUSES = new Set(['open', 'resolved', 'ignored'])

// Mark an error group resolved / ignored / open again.
export async function PATCH(request: Request, ctx: RouteContext<'/api/admin/errors/[id]'>) {
  const { res } = await adminApi(request)
  if (res) return res

  const { id } = await ctx.params
  const body = await readJson<{ status?: string }>(request)
  if (!body?.status || !STATUSES.has(body.status)) return fail('status must be open, resolved or ignored')

  try {
    const event = await prisma.errorEvent.update({
      where: { id },
      data: { status: body.status, resolvedAt: body.status === 'resolved' ? new Date() : null },
      select: { id: true, status: true },
    })
    return ok({ error: event })
  } catch (e) {
    if (isNotFound(e)) return fail('Not found', 404)
    throw e
  }
}
