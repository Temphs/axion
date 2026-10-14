import { after } from 'next/server'
import { prisma } from '@/lib/db'
import { track } from '@/lib/monitoring/record'
import { ok, fail, readJson, authed, authedAny, isForeignKeyConstraint, MAX_NAME, MAX_NOTES } from '@/lib/api'
import { parseEntryDate } from '@/lib/entryDate'

const MAX_LIMIT = 500
const DEFAULT_LIMIT = 100
// Largest batch accepted in one request; bigger syncs must be split.
const MAX_BATCH = 1000
const MAX_EXTERNAL_ID = 200

type EntryInput = {
  date?: string
  employeeId?: string
  clientId?: string
  workType?: string
  minutes?: number
  hours?: number
  notes?: string
  externalId?: string
}

type NormalizedEntry = {
  date: Date
  employeeId: string
  clientId: string
  workType: string | null
  minutes: number
  notes: string | null
  externalId: string | null
}

function normalizeEntry(input: EntryInput): { data: NormalizedEntry } | { error: string } {
  if (!input || typeof input !== 'object') return { error: 'entry must be an object' }
  if (!input.employeeId) return { error: 'employeeId is required' }
  if (!input.clientId) return { error: 'clientId is required' }
  if (typeof input.employeeId !== 'string' || typeof input.clientId !== 'string') {
    return { error: 'employeeId and clientId must be strings' }
  }

  const parsedDate = parseEntryDate(input.date)
  if ('error' in parsedDate) return { error: parsedDate.error }
  const date = parsedDate.date

  const workType = input.workType?.toString().trim() || null
  const notes = input.notes?.toString().trim() || null
  const externalId = input.externalId?.toString().trim() || null
  if (workType && workType.length > MAX_NAME) return { error: `workType must be at most ${MAX_NAME} characters` }
  if (notes && notes.length > MAX_NOTES) return { error: `notes must be at most ${MAX_NOTES} characters` }
  if (externalId && externalId.length > MAX_EXTERNAL_ID) {
    return { error: `externalId must be at most ${MAX_EXTERNAL_ID} characters` }
  }

  let minutes: number
  if (typeof input.minutes === 'number') minutes = Math.round(input.minutes)
  else if (typeof input.hours === 'number') minutes = Math.round(input.hours * 60)
  else return { error: 'minutes or hours is required' }
  if (!Number.isFinite(minutes) || minutes <= 0) return { error: 'minutes/hours must be a positive number' }
  if (minutes > 24 * 60) return { error: 'a single entry cannot exceed 24 hours' }

  return {
    data: {
      date,
      employeeId: input.employeeId,
      clientId: input.clientId,
      workType,
      minutes,
      notes,
      externalId,
    },
  }
}

export async function GET(request: Request) {
  const { user, res } = await authed()
  if (res) return res

  const { searchParams } = new URL(request.url)
  const where: Record<string, unknown> = { userId: user.id }

  const employeeId = searchParams.get('employeeId')
  const clientId = searchParams.get('clientId')
  if (employeeId) where.employeeId = employeeId
  if (clientId) where.clientId = clientId

  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const dateFilter: Record<string, Date> = {}
  if (from) {
    const d = new Date(from)
    if (Number.isNaN(d.getTime())) return fail('invalid "from" date')
    dateFilter.gte = d
  }
  if (to) {
    const d = new Date(to)
    if (Number.isNaN(d.getTime())) return fail('invalid "to" date')
    dateFilter.lte = d
  }
  if (Object.keys(dateFilter).length) where.date = dateFilter

  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get('limit')) || DEFAULT_LIMIT))
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0)

  const [entries, total] = await Promise.all([
    prisma.workEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
      include: {
        employee: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    }),
    prisma.workEntry.count({ where }),
  ])

  return ok({
    entries: entries.map((e) => ({ ...e, hours: e.minutes / 60 })),
    total,
    limit,
    offset,
  })
}

export async function POST(request: Request) {
  const { principal, userId, res } = await authedAny(request)
  if (res) return res

  const body = await readJson<EntryInput | EntryInput[] | { entries?: EntryInput[] }>(request)
  if (!body) return fail('Invalid JSON body')

  const isBatch = Array.isArray(body) || Array.isArray((body as { entries?: unknown }).entries)

  // --- Batch ingestion (used by the time-tracking app) ---
  if (isBatch) {
    const items = Array.isArray(body) ? body : (body as { entries: EntryInput[] }).entries
    if (!items.length) return fail('entries array is empty')
    if (items.length > MAX_BATCH) return fail(`at most ${MAX_BATCH} entries per request — split the batch`, 413)

    const normalized: NormalizedEntry[] = []
    const errors: { index: number; error: string }[] = []
    items.forEach((item, index) => {
      const result = normalizeEntry(item)
      if ('error' in result) errors.push({ index, error: result.error })
      else normalized.push(result.data)
    })
    if (errors.length) return Response.json({ error: 'Validation failed', details: errors }, { status: 400 })

    // Verify referenced employees/clients exist for a clear error rather than an opaque FK failure.
    const employeeIds = [...new Set(normalized.map((n) => n.employeeId))]
    const clientIds = [...new Set(normalized.map((n) => n.clientId))]
    const [foundEmp, foundCli] = await Promise.all([
      prisma.employee.findMany({ where: { id: { in: employeeIds }, userId }, select: { id: true } }),
      prisma.client.findMany({ where: { id: { in: clientIds }, userId }, select: { id: true } }),
    ])
    const empSet = new Set(foundEmp.map((e) => e.id))
    const cliSet = new Set(foundCli.map((c) => c.id))
    const missingEmp = employeeIds.filter((id) => !empSet.has(id))
    const missingCli = clientIds.filter((id) => !cliSet.has(id))
    if (missingEmp.length || missingCli.length) {
      return Response.json(
        { error: 'Unknown references', missingEmployeeIds: missingEmp, missingClientIds: missingCli },
        { status: 400 }
      )
    }

    // externalId makes ingestion idempotent: re-syncing the same entry updates it instead of duplicating.
    await prisma.$transaction(
      normalized.map((data) =>
        data.externalId
          ? prisma.workEntry.upsert({
              where: { userId_externalId: { userId, externalId: data.externalId } },
              create: { ...data, userId },
              update: { ...data, userId },
            })
          : prisma.workEntry.create({ data: { ...data, userId } })
      )
    )

    if (principal.kind === 'apiKey') after(() => track('api_entries', normalized.length))
    return ok({ processed: normalized.length }, { status: 201 })
  }

  // --- Single entry ---
  const result = normalizeEntry(body as EntryInput)
  if ('error' in result) return fail(result.error)

  try {
    const entry = result.data.externalId
      ? await prisma.workEntry.upsert({
          where: { userId_externalId: { userId, externalId: result.data.externalId } },
          create: { ...result.data, userId },
          update: { ...result.data, userId },
        })
      : await prisma.workEntry.create({ data: { ...result.data, userId } })
    return ok({ entry: { ...entry, hours: entry.minutes / 60 } }, { status: 201 })
  } catch (e) {
    if (isForeignKeyConstraint(e)) return fail('Unknown employeeId or clientId', 400)
    throw e
  }
}
