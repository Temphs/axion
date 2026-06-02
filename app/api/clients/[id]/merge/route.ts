import { prisma } from '@/lib/db'
import { ok, fail, readJson, authed } from '@/lib/api'

// Merge the client [id] (the source) into another client (the target):
// every work entry of the source is reassigned to the target, then the source
// is deleted. Useful when the same real client was entered twice
// (e.g. "Παπαλούκας" and "Παπαλούκας ΙΚΕ"). The target keeps its own name,
// revenue, billable flag and notes.
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  const body = await readJson<{ into?: string }>(request)
  if (!body) return fail('Invalid JSON body')

  const targetId = body.into?.toString().trim()
  if (!targetId) return fail('into (target client id) is required')
  if (targetId === id) return fail('Cannot merge a client into itself')

  const [source, target] = await Promise.all([
    prisma.client.findFirst({ where: { id, userId: user.id } }),
    prisma.client.findFirst({ where: { id: targetId, userId: user.id } }),
  ])
  if (!source) return fail('Source client not found', 404)
  if (!target) return fail('Target client not found', 404)

  // Reassign first, then delete — order matters so the onDelete: Restrict FK
  // is satisfied. $transaction runs the operations atomically and in order.
  const [moved] = await prisma.$transaction([
    prisma.workEntry.updateMany({ where: { clientId: id, userId: user.id }, data: { clientId: targetId } }),
    prisma.client.delete({ where: { id } }),
  ])

  return ok({
    ok: true,
    movedEntries: moved.count,
    target: { id: target.id, name: target.name },
  })
}
