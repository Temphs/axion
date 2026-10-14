import { prisma } from '@/lib/db'
import { fail, ok, readJson } from '@/lib/api'
import {
  EDIT_WINDOW_DAYS,
  isWithinEditWindow,
  loadTerminalData,
  resolveTerminal,
  type TerminalSession,
} from '@/lib/terminal'

const MAX_HOURS_PER_ENTRY = 24

// Fetching and authorising in one place: the entry must belong to this
// employee and still be inside the correction window.
async function ownEditableEntry(session: TerminalSession, id: string) {
  const entry = await prisma.workEntry.findFirst({
    where: { id, userId: session.userId, employeeId: session.employeeId },
    select: { id: true, date: true },
  })
  if (!entry) return { entry: null, res: fail('Η καταχώρηση δεν βρέθηκε', 404) }
  if (!isWithinEditWindow(entry.date)) {
    return { entry: null, res: fail(`Μπορείτε να διορθώσετε μόνο τις τελευταίες ${EDIT_WINDOW_DAYS} ημέρες`, 403) }
  }
  return { entry, res: null }
}

export async function PATCH(request: Request, ctx: RouteContext<'/api/terminal/[token]/entries/[id]'>) {
  const { token, id } = await ctx.params
  const session = await resolveTerminal(token)
  if (!session) return fail('Ο σύνδεσμος δεν ισχύει', 404)

  const { entry, res } = await ownEditableEntry(session, id)
  if (res) return res

  const body = await readJson<{ hours?: number; clientId?: string; workType?: string; notes?: string }>(request)
  if (!body) return fail('Μη έγκυρα δεδομένα')

  const data: Record<string, unknown> = {}
  if (body.hours !== undefined) {
    if (typeof body.hours !== 'number' || !Number.isFinite(body.hours) || body.hours <= 0) {
      return fail('Οι ώρες πρέπει να είναι θετικός αριθμός')
    }
    if (body.hours > MAX_HOURS_PER_ENTRY) return fail('Οι ώρες μιας καταχώρησης δεν μπορούν να ξεπερνούν τις 24')
    data.minutes = Math.round(body.hours * 60)
  }
  if (body.clientId !== undefined) {
    const client = await prisma.client.findFirst({
      where: { id: body.clientId, userId: session.userId, active: true },
      select: { id: true },
    })
    if (!client) return fail('Άγνωστος πελάτης', 400)
    data.clientId = client.id
  }
  if (body.workType !== undefined) data.workType = body.workType.trim() || null
  if (body.notes !== undefined) data.notes = body.notes.trim() || null

  await prisma.workEntry.update({ where: { id: entry.id }, data })
  return ok(await loadTerminalData(session, entry.date))
}

export async function DELETE(_request: Request, ctx: RouteContext<'/api/terminal/[token]/entries/[id]'>) {
  const { token, id } = await ctx.params
  const session = await resolveTerminal(token)
  if (!session) return fail('Ο σύνδεσμος δεν ισχύει', 404)

  const { entry, res } = await ownEditableEntry(session, id)
  if (res) return res

  await prisma.workEntry.delete({ where: { id: entry.id } })
  return ok(await loadTerminalData(session, entry.date))
}
