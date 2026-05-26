import { prisma } from '@/lib/db'
import { ok, fail, readJson, authed, authedAny, isUniqueViolation } from '@/lib/api'
import { getSettings, hoursPerMonth } from '@/lib/settings'

export async function GET(request: Request) {
  const { res } = await authedAny(request)
  if (res) return res

  const [employees, settings] = await Promise.all([
    prisma.employee.findMany({ orderBy: { name: 'asc' } }),
    getSettings(),
  ])
  const hpm = hoursPerMonth(settings)

  return ok({
    employees: employees.map((e) => ({
      ...e,
      costPerHour: hpm > 0 ? e.monthlyCost / hpm : 0,
    })),
  })
}

export async function POST(request: Request) {
  const { res } = await authed()
  if (res) return res

  const body = await readJson<{
    name?: string
    monthlyCost?: number
    notes?: string
    active?: boolean
  }>(request)
  if (!body) return fail('Invalid JSON body')

  const name = body.name?.trim()
  if (!name) return fail('name is required')

  const monthlyCost = body.monthlyCost ?? 0
  if (typeof monthlyCost !== 'number' || !Number.isFinite(monthlyCost) || monthlyCost < 0) {
    return fail('monthlyCost must be a non-negative number')
  }

  try {
    const employee = await prisma.employee.create({
      data: {
        name,
        monthlyCost,
        notes: body.notes?.trim() || null,
        active: body.active ?? true,
      },
    })
    return ok({ employee }, { status: 201 })
  } catch (e) {
    if (isUniqueViolation(e)) return fail('An employee with this name already exists', 409)
    throw e
  }
}
