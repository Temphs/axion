import { prisma } from '@/lib/db'
import { ok, fail, readJson, authed, authedAny, isUniqueViolation } from '@/lib/api'

export async function GET(request: Request) {
  const { userId, res } = await authedAny(request)
  if (res) return res

  const clients = await prisma.client.findMany({ where: { userId }, orderBy: { name: 'asc' } })
  return ok({ clients })
}

export async function POST(request: Request) {
  const { user, res } = await authed()
  if (res) return res

  const body = await readJson<{
    name?: string
    billable?: boolean
    monthlyRevenue?: number
    notes?: string
    active?: boolean
  }>(request)
  if (!body) return fail('Invalid JSON body')

  const name = body.name?.trim()
  if (!name) return fail('name is required')

  const monthlyRevenue = body.monthlyRevenue ?? 0
  if (typeof monthlyRevenue !== 'number' || !Number.isFinite(monthlyRevenue) || monthlyRevenue < 0) {
    return fail('monthlyRevenue must be a non-negative number')
  }

  try {
    const client = await prisma.client.create({
      data: {
        userId: user.id,
        name,
        billable: body.billable ?? true,
        monthlyRevenue,
        notes: body.notes?.trim() || null,
        active: body.active ?? true,
      },
    })
    return ok({ client }, { status: 201 })
  } catch (e) {
    if (isUniqueViolation(e)) return fail('A client with this name already exists', 409)
    throw e
  }
}
