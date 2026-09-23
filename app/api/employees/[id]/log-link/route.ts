import { authed, fail, ok } from '@/lib/api'
import { getOrCreateLogToken, rotateLogToken } from '@/lib/employeeLog'

// GET returns the employee's existing work-log token, minting one on first
// call. POST discards it and issues a new one (the old link stops working).
// Both require the manager's own session — an employee never reaches this.

export async function GET(_req: Request, ctx: RouteContext<'/api/employees/[id]/log-link'>) {
  const { user, res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  const token = await getOrCreateLogToken(user.id, id)
  if (!token) return fail('Employee not found', 404)
  return ok({ token })
}

export async function POST(_req: Request, ctx: RouteContext<'/api/employees/[id]/log-link'>) {
  const { user, res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  const token = await rotateLogToken(user.id, id)
  if (!token) return fail('Employee not found', 404)
  return ok({ token })
}
