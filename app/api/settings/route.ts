import { prisma } from '@/lib/db'
import { ok, fail, readJson, authed } from '@/lib/api'
import { getSettings, hoursPerMonth } from '@/lib/settings'

export async function GET() {
  const { res } = await authed()
  if (res) return res

  const settings = await getSettings()
  return ok({ settings: { ...settings, hoursPerMonth: hoursPerMonth(settings) } })
}

export async function PATCH(request: Request) {
  const { res } = await authed()
  if (res) return res

  const body = await readJson<{
    hoursPerDay?: number
    daysPerMonth?: number
    includeOverhead?: boolean
  }>(request)
  if (!body) return fail('Invalid JSON body')

  const data: Record<string, unknown> = {}
  if (body.hoursPerDay !== undefined) {
    if (typeof body.hoursPerDay !== 'number' || !Number.isFinite(body.hoursPerDay) || body.hoursPerDay <= 0) {
      return fail('hoursPerDay must be a positive number')
    }
    data.hoursPerDay = body.hoursPerDay
  }
  if (body.daysPerMonth !== undefined) {
    if (typeof body.daysPerMonth !== 'number' || !Number.isFinite(body.daysPerMonth) || body.daysPerMonth <= 0) {
      return fail('daysPerMonth must be a positive number')
    }
    data.daysPerMonth = body.daysPerMonth
  }
  if (body.includeOverhead !== undefined) data.includeOverhead = !!body.includeOverhead

  // Ensure the singleton exists, then apply the update.
  await getSettings()
  const settings = await prisma.settings.update({ where: { id: 1 }, data })
  return ok({ settings: { ...settings, hoursPerMonth: hoursPerMonth(settings) } })
}
