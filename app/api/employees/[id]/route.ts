import { prisma } from '@/lib/db'
import { ok, fail, readJson, authed, isUniqueViolation, isNotFound, isForeignKeyConstraint } from '@/lib/api'
import { getSettings, hoursPerMonth } from '@/lib/settings'

export async function GET(_req: Request, ctx: RouteContext<'/api/employees/[id]'>) {
  const { res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  const [employee, settings] = await Promise.all([
    prisma.employee.findUnique({ where: { id } }),
    getSettings(),
  ])
  if (!employee) return fail('Employee not found', 404)

  const hpm = hoursPerMonth(settings)
  return ok({ employee: { ...employee, costPerHour: hpm > 0 ? employee.monthlyCost / hpm : 0 } })
}

export async function PATCH(request: Request, ctx: RouteContext<'/api/employees/[id]'>) {
  const { res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  const body = await readJson<{
    name?: string
    monthlyCost?: number
    notes?: string | null
    active?: boolean
  }>(request)
  if (!body) return fail('Invalid JSON body')

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const name = body.name.trim()
    if (!name) return fail('name cannot be empty')
    data.name = name
  }
  if (body.monthlyCost !== undefined) {
    if (typeof body.monthlyCost !== 'number' || !Number.isFinite(body.monthlyCost) || body.monthlyCost < 0) {
      return fail('monthlyCost must be a non-negative number')
    }
    data.monthlyCost = body.monthlyCost
  }
  if (body.notes !== undefined) data.notes = body.notes?.toString().trim() || null
  if (body.active !== undefined) data.active = !!body.active

  try {
    const employee = await prisma.employee.update({ where: { id }, data })
    return ok({ employee })
  } catch (e) {
    if (isNotFound(e)) return fail('Employee not found', 404)
    if (isUniqueViolation(e)) return fail('An employee with this name already exists', 409)
    throw e
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<'/api/employees/[id]'>) {
  const { res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  try {
    await prisma.employee.delete({ where: { id } })
    return ok({ ok: true })
  } catch (e) {
    if (isNotFound(e)) return fail('Employee not found', 404)
    if (isForeignKeyConstraint(e)) {
      return fail('Cannot delete an employee that has logged work. Deactivate them instead.', 409)
    }
    throw e
  }
}
