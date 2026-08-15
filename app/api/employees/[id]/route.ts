import { prisma } from '@/lib/db'
import { ok, fail, readJson, authed, isUniqueViolation, isNotFound, isForeignKeyConstraint } from '@/lib/api'
import { getSettings, hoursPerMonth } from '@/lib/settings'

export async function GET(_req: Request, ctx: RouteContext<'/api/employees/[id]'>) {
  const { user, res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  const [employee, settings] = await Promise.all([
    prisma.employee.findFirst({ where: { id, userId: user.id } }),
    getSettings(user.id),
  ])
  if (!employee) return fail('Employee not found', 404)

  const hpm = hoursPerMonth(settings)
  return ok({ employee: { ...employee, costPerHour: hpm > 0 ? employee.monthlyCost / hpm : 0 } })
}

export async function PATCH(request: Request, ctx: RouteContext<'/api/employees/[id]'>) {
  const { user, res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  const owned = await prisma.employee.findFirst({ where: { id, userId: user.id }, select: { id: true } })
  if (!owned) return fail('Employee not found', 404)

  const body = await readJson<{
    name?: string
    monthlyCost?: number
    notes?: string | null
    active?: boolean
    contractHoursPerMonth?: number | null
    targetUtilizationPct?: number | null
    targetMonthlyHours?: number | null
    targetMonthlyContribution?: number | null
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

  // Optional numeric fields: a value within range, or null to clear.
  const targetFields = [
    ['contractHoursPerMonth', 1, 744], // 744 = hours in the longest month
    ['targetUtilizationPct', 0, 100],
    ['targetMonthlyHours', 0, 1000],
    ['targetMonthlyContribution', -1_000_000, 10_000_000],
  ] as const
  for (const [field, min, max] of targetFields) {
    const value = body[field]
    if (value === undefined) continue
    if (value === null) {
      data[field] = null
    } else if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      return fail(`${field} must be a number between ${min} and ${max}, or null`)
    } else {
      data[field] = value
    }
  }

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
  const { user, res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  const owned = await prisma.employee.findFirst({ where: { id, userId: user.id }, select: { id: true } })
  if (!owned) return fail('Employee not found', 404)

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
