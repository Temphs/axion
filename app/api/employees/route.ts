import { prisma } from '@/lib/db'
import { ok, fail, readJson, authed, authedAny, isUniqueViolation, MAX_NAME, MAX_NOTES } from '@/lib/api'
import { getSettings, hoursPerMonth } from '@/lib/settings'

export async function GET(request: Request) {
  const { principal, userId, res } = await authedAny(request)
  if (res) return res

  // The time-tracking app only needs to map entries to people: never hand an
  // API key salaries, notes or targets.
  if (principal.kind === 'apiKey') {
    const employees = await prisma.employee.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, active: true },
    })
    return ok({ employees })
  }

  const [employees, settings] = await Promise.all([
    prisma.employee.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    getSettings(userId),
  ])
  const hpm = hoursPerMonth(settings)

  return ok({
    employees: employees.map((e) => {
      // Same basis as the dashboards: the employee's own contract hours, else the account default.
      const hours = e.contractHoursPerMonth ?? hpm
      return { ...e, costPerHour: hours > 0 ? e.monthlyCost / hours : 0 }
    }),
  })
}

export async function POST(request: Request) {
  const { user, res } = await authed()
  if (res) return res

  const body = await readJson<{
    name?: string
    monthlyCost?: number
    notes?: string
    active?: boolean
  }>(request)
  if (!body) return fail('Invalid JSON body')

  const name = body.name?.toString().trim()
  if (!name) return fail('name is required')
  if (name.length > MAX_NAME) return fail(`name must be at most ${MAX_NAME} characters`)
  if (body.notes && body.notes.toString().length > MAX_NOTES) return fail(`notes must be at most ${MAX_NOTES} characters`)

  const monthlyCost = body.monthlyCost ?? 0
  if (typeof monthlyCost !== 'number' || !Number.isFinite(monthlyCost) || monthlyCost < 0) {
    return fail('monthlyCost must be a non-negative number')
  }

  try {
    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        name,
        monthlyCost,
        notes: body.notes?.toString().trim() || null,
        active: body.active ?? true,
      },
    })
    return ok({ employee }, { status: 201 })
  } catch (e) {
    if (isUniqueViolation(e)) return fail('An employee with this name already exists', 409)
    throw e
  }
}
