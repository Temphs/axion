import 'server-only'
import { prisma } from '@/lib/db'
import { applyMissingSchema, schemaStatus } from '@/lib/admin/schema'
import { businessToday } from '@/lib/entryDate'

// One-click fixes in the admin console. Each is safe to run at any time and
// idempotent: it only removes things nobody can use any more (expired
// credentials, links of deactivated people, old monitoring rows) or adds the
// database objects the app expects. Nothing here touches a customer's own
// employees, clients or hours.

export type FixId = 'schema' | 'expired-sessions' | 'reset-tokens' | 'inactive-links' | 'stale-errors' | 'old-monitoring'

type Fix = {
  id: FixId
  title: string
  description: string
  // How many things the fix would change right now (0 = nothing to do).
  pending: () => Promise<number>
  run: () => Promise<string>
}

const DAY_MS = 86_400_000
const STALE_ERROR_DAYS = 14
const KEEP_ERRORS_DAYS = 90
const KEEP_ANALYTICS_DAYS = 400

const isoDay = (offsetDays: number) => new Date(businessToday().getTime() - offsetDays * DAY_MS).toISOString().slice(0, 10)

export const FIXES: Fix[] = [
  {
    id: 'schema',
    title: 'Apply missing database changes',
    description: 'Creates the tables, columns and indexes this version of the app needs. Additive only: nothing is dropped or rewritten.',
    pending: async () => (await schemaStatus()).reduce((n, s) => n + s.missing.length, 0),
    run: async () => {
      const applied = await applyMissingSchema()
      return applied.length ? `Applied: ${applied.join(', ')}` : 'Database already up to date'
    },
  },
  {
    id: 'expired-sessions',
    title: 'Delete expired logins',
    description: 'Removes login sessions that have already expired. Nobody is signed out.',
    pending: () => prisma.session.count({ where: { expiresAt: { lt: new Date() } } }),
    run: async () => {
      const { count } = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })
      return `Deleted ${count} expired session${count === 1 ? '' : 's'}`
    },
  },
  {
    id: 'reset-tokens',
    title: 'Delete used or expired password-reset links',
    description: 'These links can no longer be used; keeping them serves no purpose.',
    pending: () => prisma.passwordResetToken.count({ where: { OR: [{ usedAt: { not: null } }, { expiresAt: { lt: new Date() } }] } }),
    run: async () => {
      const { count } = await prisma.passwordResetToken.deleteMany({
        where: { OR: [{ usedAt: { not: null } }, { expiresAt: { lt: new Date() } }] },
      })
      return `Deleted ${count} reset link${count === 1 ? '' : 's'}`
    },
  },
  {
    id: 'inactive-links',
    title: 'Revoke entry links of deactivated employees',
    description: 'Deactivated employees already cannot log hours; this removes their links for good, so reactivating them later needs a new link.',
    pending: () => prisma.employee.count({ where: { active: false, accessToken: { not: null } } }),
    run: async () => {
      const { count } = await prisma.employee.updateMany({
        where: { active: false, accessToken: { not: null } },
        data: { accessToken: null, accessTokenAt: null },
      })
      return `Revoked ${count} link${count === 1 ? '' : 's'}`
    },
  },
  {
    id: 'stale-errors',
    title: `Resolve errors not seen for ${STALE_ERROR_DAYS} days`,
    description: 'Marks old open errors as resolved. If one happens again it reopens automatically.',
    pending: () =>
      prisma.errorEvent.count({ where: { status: 'open', lastSeenAt: { lt: new Date(Date.now() - STALE_ERROR_DAYS * DAY_MS) } } }),
    run: async () => {
      const { count } = await prisma.errorEvent.updateMany({
        where: { status: 'open', lastSeenAt: { lt: new Date(Date.now() - STALE_ERROR_DAYS * DAY_MS) } },
        data: { status: 'resolved', resolvedAt: new Date() },
      })
      return `Resolved ${count} error${count === 1 ? '' : 's'}`
    },
  },
  {
    id: 'old-monitoring',
    title: 'Clean up old monitoring data',
    description: `Deletes resolved/ignored errors older than ${KEEP_ERRORS_DAYS} days and analytics older than ${KEEP_ANALYTICS_DAYS} days.`,
    pending: async () => {
      const [errors, views, metrics] = await Promise.all([
        prisma.errorEvent.count({
          where: { status: { in: ['resolved', 'ignored'] }, lastSeenAt: { lt: new Date(Date.now() - KEEP_ERRORS_DAYS * DAY_MS) } },
        }),
        prisma.pageViewDaily.count({ where: { day: { lt: isoDay(KEEP_ANALYTICS_DAYS) } } }),
        prisma.metricDaily.count({ where: { day: { lt: isoDay(KEEP_ANALYTICS_DAYS) } } }),
      ])
      return errors + views + metrics
    },
    run: async () => {
      const [errors, views, metrics] = await prisma.$transaction([
        prisma.errorEvent.deleteMany({
          where: { status: { in: ['resolved', 'ignored'] }, lastSeenAt: { lt: new Date(Date.now() - KEEP_ERRORS_DAYS * DAY_MS) } },
        }),
        prisma.pageViewDaily.deleteMany({ where: { day: { lt: isoDay(KEEP_ANALYTICS_DAYS) } } }),
        prisma.metricDaily.deleteMany({ where: { day: { lt: isoDay(KEEP_ANALYTICS_DAYS) } } }),
      ])
      return `Deleted ${errors.count + views.count + metrics.count} old row(s)`
    },
  },
]

export type FixStatus = { id: FixId; title: string; description: string; pending: number | null }

// Pending counts for the console. A fix whose tables don't exist yet reports
// null ("unavailable") instead of failing the whole page.
export async function fixStatuses(): Promise<FixStatus[]> {
  return Promise.all(
    FIXES.map(async (f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      pending: await f.pending().catch(() => null),
    }))
  )
}

export function findFix(id: string): Fix | undefined {
  return FIXES.find((f) => f.id === id)
}
