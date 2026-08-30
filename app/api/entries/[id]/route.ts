import { prisma } from '@/lib/db'
import { ok, fail, readJson, authed, isNotFound, isForeignKeyConstraint } from '@/lib/api'

// Kept in step with the create path in ../route.ts.
const MAX_FUTURE_MS = 36 * 60 * 60 * 1000
const MAX_MINUTES = 24 * 60

export async function GET(_req: Request, ctx: RouteContext<'/api/entries/[id]'>) {
  const { user, res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  const entry = await prisma.workEntry.findFirst({
    where: { id, userId: user.id },
    include: {
      employee: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  })
  if (!entry) return fail('Entry not found', 404)
  return ok({ entry: { ...entry, hours: entry.minutes / 60 } })
}

export async function PATCH(request: Request, ctx: RouteContext<'/api/entries/[id]'>) {
  const { user, res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  const owned = await prisma.workEntry.findFirst({ where: { id, userId: user.id }, select: { id: true } })
  if (!owned) return fail('Entry not found', 404)

  const body = await readJson<{
    date?: string
    employeeId?: string
    clientId?: string
    workType?: string | null
    minutes?: number
    hours?: number
    notes?: string | null
  }>(request)
  if (!body) return fail('Invalid JSON body')

  const data: Record<string, unknown> = {}
  if (body.date !== undefined) {
    const d = new Date(body.date)
    if (Number.isNaN(d.getTime())) return fail(`invalid date: ${body.date}`)
    // Mirrors the create path: a mistyped year would otherwise sit in the data
    // set skewing every period average.
    if (d.getTime() > Date.now() + MAX_FUTURE_MS) return fail(`date is in the future: ${body.date}`)
    data.date = d
  }
  if (body.employeeId !== undefined) data.employeeId = body.employeeId
  if (body.clientId !== undefined) data.clientId = body.clientId
  if (body.workType !== undefined) data.workType = body.workType?.toString().trim() || null
  if (body.notes !== undefined) data.notes = body.notes?.toString().trim() || null
  if (body.minutes !== undefined || body.hours !== undefined) {
    const minutes = typeof body.minutes === 'number' ? Math.round(body.minutes) : Math.round((body.hours as number) * 60)
    if (!Number.isFinite(minutes) || minutes <= 0) return fail('minutes/hours must be a positive number')
    if (minutes > MAX_MINUTES) return fail('minutes/hours cannot exceed 24 hours for one entry')
    data.minutes = minutes
  }

  // A reassigned employee/client must belong to the same account.
  if (typeof data.employeeId === 'string') {
    const e = await prisma.employee.findFirst({ where: { id: data.employeeId, userId: user.id }, select: { id: true } })
    if (!e) return fail('Unknown employeeId or clientId', 400)
  }
  if (typeof data.clientId === 'string') {
    const c = await prisma.client.findFirst({ where: { id: data.clientId, userId: user.id }, select: { id: true } })
    if (!c) return fail('Unknown employeeId or clientId', 400)
  }

  try {
    const entry = await prisma.workEntry.update({ where: { id }, data })
    return ok({ entry: { ...entry, hours: entry.minutes / 60 } })
  } catch (e) {
    if (isNotFound(e)) return fail('Entry not found', 404)
    if (isForeignKeyConstraint(e)) return fail('Unknown employeeId or clientId', 400)
    throw e
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<'/api/entries/[id]'>) {
  const { user, res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  const owned = await prisma.workEntry.findFirst({ where: { id, userId: user.id }, select: { id: true } })
  if (!owned) return fail('Entry not found', 404)

  try {
    await prisma.workEntry.delete({ where: { id } })
    return ok({ ok: true })
  } catch (e) {
    if (isNotFound(e)) return fail('Entry not found', 404)
    throw e
  }
}
