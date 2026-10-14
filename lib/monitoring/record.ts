import 'server-only'
import { prisma } from '@/lib/db'
import { businessToday } from '@/lib/entryDate'
import { errorFingerprint, normalizePath, scrubText } from '@/lib/monitoring/scrub'

// Writes to the monitoring tables. Every function here swallows its own
// failures: monitoring must never be the reason a request fails, and a broken
// database must not make error recording recurse.

export type ErrorInput = {
  source: 'server' | 'client'
  kind?: string
  route?: string | null
  message: string
  stack?: string | null
  userId?: string | null
}

const MAX_MESSAGE = 1000
const MAX_STACK = 4000

function today(): string {
  return businessToday().toISOString().slice(0, 10)
}

export async function recordError(input: ErrorInput): Promise<void> {
  try {
    const route = input.route ? normalizePath(input.route) : null
    const message = scrubText(input.message || 'Unknown error', MAX_MESSAGE)
    const stack = input.stack ? scrubText(input.stack, MAX_STACK) : null
    const fingerprint = errorFingerprint({ source: input.source, kind: input.kind, route, message, stack })
    const now = new Date()

    const existing = await prisma.errorEvent.findUnique({ where: { fingerprint }, select: { id: true, status: true } })
    if (existing) {
      await prisma.errorEvent.update({
        where: { id: existing.id },
        data: {
          count: { increment: 1 },
          lastSeenAt: now,
          lastUserId: input.userId ?? undefined,
          stack: stack ?? undefined,
          // A fixed error that comes back is a regression: reopen it.
          // Ignored stays ignored on purpose.
          ...(existing.status === 'resolved' ? { status: 'open', resolvedAt: null } : {}),
        },
      })
      return
    }
    await prisma.errorEvent.create({
      data: { fingerprint, source: input.source, kind: input.kind ?? null, route, message, stack, lastUserId: input.userId ?? null },
    })
  } catch (err) {
    // Two requests creating the same new fingerprint at once: the loser simply
    // counts as a repeat next time. Anything else is only logged.
    console.error('[monitoring] could not record error', err instanceof Error ? err.message : err)
  }
}

// Daily product counters: signup, login, login_failed, …
export async function track(key: string, amount = 1): Promise<void> {
  try {
    await prisma.$executeRaw`INSERT INTO "MetricDaily" ("day", "key", "count") VALUES (${today()}, ${key}, ${amount})
      ON CONFLICT ("day", "key") DO UPDATE SET "count" = "count" + excluded."count"`
  } catch {
    // Missing table before the schema fix is applied, or a transient DB error.
  }
}

export async function recordPageView(view: { path: string; referrer: string; country: string; device: string }): Promise<void> {
  try {
    await prisma.$executeRaw`INSERT INTO "PageViewDaily" ("day", "path", "referrer", "country", "device", "views")
      VALUES (${today()}, ${view.path}, ${view.referrer}, ${view.country}, ${view.device}, 1)
      ON CONFLICT ("day", "path", "referrer", "country", "device") DO UPDATE SET "views" = "views" + 1`
  } catch {
    // As above.
  }
}

// The account behind a request, from the session cookie in raw headers (used
// where next/headers isn't available, e.g. instrumentation).
export async function userIdFromCookieHeader(cookieHeader: string | string[] | undefined): Promise<string | null> {
  try {
    const raw = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader
    const token = raw?.match(/(?:^|;\s*)axion_session=([^;]+)/)?.[1]
    if (!token) return null
    const session = await prisma.session.findUnique({ where: { token }, select: { userId: true } })
    return session?.userId ?? null
  } catch {
    return null
  }
}
