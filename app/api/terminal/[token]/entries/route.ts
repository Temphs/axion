import { prisma } from '@/lib/db'
import { clientIp, fail, ok, readJson, tooManyRequests } from '@/lib/api'
import {
  EDIT_WINDOW_DAYS,
  isWithinEditWindow,
  loadTerminalData,
  parseDayParam,
  resolveTerminal,
  terminalRateLimit,
} from '@/lib/terminal'

const MAX_HOURS_PER_ENTRY = 24

type Body = {
  date?: string
  clientId?: string
  hours?: number
  workType?: string
  notes?: string
}

// One entry, always for the employee the token belongs to. Any employeeId in
// the body is ignored: the terminal cannot log time on someone else's behalf.
export async function POST(request: Request, ctx: RouteContext<'/api/terminal/[token]/entries'>) {
  const { token } = await ctx.params
  const limited = terminalRateLimit(clientIp(request), token)
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)

  const session = await resolveTerminal(token)
  if (!session) return fail('Ο σύνδεσμος δεν ισχύει', 404)

  const body = await readJson<Body>(request)
  if (!body) return fail('Μη έγκυρα δεδομένα')

  const day = parseDayParam(body.date ?? null)
  if (!isWithinEditWindow(day)) {
    return fail(`Μπορείτε να καταχωρήσετε μόνο τις τελευταίες ${EDIT_WINDOW_DAYS} ημέρες`)
  }

  if (typeof body.hours !== 'number' || !Number.isFinite(body.hours) || body.hours <= 0) {
    return fail('Οι ώρες πρέπει να είναι θετικός αριθμός')
  }
  if (body.hours > MAX_HOURS_PER_ENTRY) return fail('Οι ώρες μιας καταχώρησης δεν μπορούν να ξεπερνούν τις 24')
  if (!body.clientId) return fail('Επιλέξτε πελάτη')

  // Scoped to the owning account, so a guessed client id from another tenant
  // cannot be written to.
  const client = await prisma.client.findFirst({
    where: { id: body.clientId, userId: session.userId, active: true },
    select: { id: true },
  })
  if (!client) return fail('Άγνωστος πελάτης', 400)

  await prisma.workEntry.create({
    data: {
      userId: session.userId,
      employeeId: session.employeeId,
      clientId: client.id,
      date: day,
      minutes: Math.round(body.hours * 60),
      workType: body.workType?.trim() || null,
      notes: body.notes?.trim() || null,
    },
  })

  // Return the refreshed day so the screen never drifts from the database.
  return ok(await loadTerminalData(session, day), { status: 201 })
}
