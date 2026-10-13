import { prisma } from '@/lib/db'
import { ok, fail, readJson, authed, isUniqueViolation, isNotFound, isForeignKeyConstraint, MAX_NAME, MAX_NOTES } from '@/lib/api'

export async function GET(_req: Request, ctx: RouteContext<'/api/clients/[id]'>) {
  const { user, res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  const client = await prisma.client.findFirst({ where: { id, userId: user.id } })
  if (!client) return fail('Client not found', 404)
  return ok({ client })
}

export async function PATCH(request: Request, ctx: RouteContext<'/api/clients/[id]'>) {
  const { user, res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  const owned = await prisma.client.findFirst({ where: { id, userId: user.id }, select: { id: true } })
  if (!owned) return fail('Client not found', 404)

  const body = await readJson<{
    name?: string
    billable?: boolean
    monthlyRevenue?: number
    plannedMonthlyHours?: number | null
    notes?: string | null
    active?: boolean
  }>(request)
  if (!body) return fail('Invalid JSON body')

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const name = body.name?.toString().trim()
    if (!name) return fail('name cannot be empty')
    if (name.length > MAX_NAME) return fail(`name must be at most ${MAX_NAME} characters`)
    data.name = name
  }
  if (body.monthlyRevenue !== undefined) {
    if (typeof body.monthlyRevenue !== 'number' || !Number.isFinite(body.monthlyRevenue) || body.monthlyRevenue < 0) {
      return fail('monthlyRevenue must be a non-negative number')
    }
    data.monthlyRevenue = body.monthlyRevenue
  }
  if (body.plannedMonthlyHours !== undefined) {
    if (body.plannedMonthlyHours === null) {
      data.plannedMonthlyHours = null
    } else if (
      typeof body.plannedMonthlyHours !== 'number' ||
      !Number.isFinite(body.plannedMonthlyHours) ||
      body.plannedMonthlyHours < 0 ||
      body.plannedMonthlyHours > 10_000
    ) {
      return fail('plannedMonthlyHours must be a non-negative number or null')
    } else {
      data.plannedMonthlyHours = body.plannedMonthlyHours
    }
  }
  if (body.billable !== undefined) data.billable = !!body.billable
  if (body.notes !== undefined) {
    const notes = body.notes?.toString().trim() || null
    if (notes && notes.length > MAX_NOTES) return fail(`notes must be at most ${MAX_NOTES} characters`)
    data.notes = notes
  }
  if (body.active !== undefined) data.active = !!body.active

  try {
    const client = await prisma.client.update({ where: { id }, data })
    return ok({ client })
  } catch (e) {
    if (isNotFound(e)) return fail('Client not found', 404)
    if (isUniqueViolation(e)) return fail('A client with this name already exists', 409)
    throw e
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<'/api/clients/[id]'>) {
  const { user, res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  const owned = await prisma.client.findFirst({ where: { id, userId: user.id }, select: { id: true } })
  if (!owned) return fail('Client not found', 404)

  try {
    await prisma.client.delete({ where: { id } })
    return ok({ ok: true })
  } catch (e) {
    if (isNotFound(e)) return fail('Client not found', 404)
    if (isForeignKeyConstraint(e)) {
      return fail('Cannot delete a client that has logged work. Deactivate it instead.', 409)
    }
    throw e
  }
}
