import { prisma } from '@/lib/db'
import { ok, fail, authed, isNotFound } from '@/lib/api'

// Revoke a key (soft): it can no longer authenticate, but the record is kept for audit.
export async function DELETE(_req: Request, ctx: RouteContext<'/api/api-keys/[id]'>) {
  const { res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  try {
    const key = await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } })
    return ok({ apiKey: { id: key.id, revokedAt: key.revokedAt } })
  } catch (e) {
    if (isNotFound(e)) return fail('API key not found', 404)
    throw e
  }
}
