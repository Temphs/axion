import { after } from 'next/server'
import { prisma } from '@/lib/db'
import { track } from '@/lib/monitoring/record'
import { fail, ok, readJson, MAX_NAME, MAX_NOTES } from '@/lib/api'
import { rateLimit, tooManyRequests } from '@/lib/rateLimit'
import {
  EDIT_WINDOW_DAYS,
  isWithinEditWindow,
  loadTerminalData,
  parseDayParam,
  resolveTerminal,
  terminalText,
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
  const session = await resolveTerminal(token)
  if (!session) return fail('Ο σύνδεσμος δεν ισχύει', 404)

  // A leaked link could otherwise be scripted to flood the account with entries.
  const limited = rateLimit(`terminal-write:${session.employeeId}`, 120, 60 * 60_000)
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds, 'Πολλές καταχωρήσεις — δοκιμάστε ξανά αργότερα')

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
  if (!body.clientId || typeof body.clientId !== 'string') return fail('Επιλέξτε πελάτη')
  const workType = terminalText(body.workType, MAX_NAME)
  const notes = terminalText(body.notes, MAX_NOTES)
  if (workType === undefined) return fail(`Το είδος εργασίας μπορεί να έχει έως ${MAX_NAME} χαρακτήρες`)
  if (notes === undefined) return fail(`Οι σημειώσεις μπορούν να έχουν έως ${MAX_NOTES} χαρακτήρες`)

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
      workType,
      notes,
    },
  })

  after(() => track('terminal_entry'))
  // Return the refreshed day so the screen never drifts from the database.
  return ok(await loadTerminalData(session, day), { status: 201 })
}
