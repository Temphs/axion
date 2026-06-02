import { prisma } from '@/lib/db'
import { ok, fail, readJson, authed } from '@/lib/api'
import { getSettings, hoursPerMonth } from '@/lib/settings'

export async function GET() {
  const { user, res } = await authed()
  if (res) return res

  const settings = await getSettings(user.id)
  return ok({ settings: { ...settings, hoursPerMonth: hoursPerMonth(settings) } })
}

export async function PATCH(request: Request) {
  const { user, res } = await authed()
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

  // Ensure this account's settings row exists, then apply the update.
  await getSettings(user.id)
  const settings = await prisma.settings.update({ where: { userId: user.id }, data })
  return ok({ settings: { ...settings, hoursPerMonth: hoursPerMonth(settings) } })
}
