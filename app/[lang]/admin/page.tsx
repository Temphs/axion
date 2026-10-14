import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { requireAdminPage } from '@/lib/admin/auth'
import { runHealthChecks } from '@/lib/admin/health'
import { fixStatuses } from '@/lib/admin/fixes'
import { loadAnalytics } from '@/lib/admin/analytics'
import { AdminConsole, type ErrorRow } from '@/components/admin/AdminConsole'

export const metadata: Metadata = { title: 'Axion Admin', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

// Platform admin console: health, one-click fixes, error log and analytics.
// Only for accounts listed in ADMIN_EMAILS; everyone else gets a 404.
export default async function AdminPage({ params }: PageProps<'/[lang]/admin'>) {
  const { lang } = await params
  const admin = await requireAdminPage()

  const [alerts, fixes, analytics, errors] = await Promise.all([
    runHealthChecks(),
    fixStatuses(),
    loadAnalytics(),
    prisma.errorEvent
      .findMany({
        orderBy: [{ lastSeenAt: 'desc' }],
        take: 200,
        include: { lastUser: { select: { email: true } } },
      })
      .then((rows) =>
        rows.map(
          (e): ErrorRow => ({
            id: e.id,
            source: e.source,
            kind: e.kind,
            route: e.route,
            message: e.message,
            stack: e.stack,
            count: e.count,
            status: e.status,
            firstSeenAt: e.firstSeenAt.toISOString(),
            lastSeenAt: e.lastSeenAt.toISOString(),
            userEmail: e.lastUser?.email ?? null,
          })
        )
      )
      .catch(() => null), // table not created yet: the schema alert explains
  ])

  return (
    <AdminConsole
      lang={lang}
      adminEmail={admin.email}
      generatedAt={new Date().toISOString()}
      alerts={alerts}
      fixes={fixes}
      errors={errors}
      analytics={analytics}
    />
  )
}
