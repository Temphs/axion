import { prisma } from '@/lib/db'
import { authed } from '@/lib/api'
import { rateLimit, tooManyRequests } from '@/lib/rateLimit'
import { jsonDownload, today } from '@/lib/exportResponse'

// Everything stored for this workspace, as one JSON file (GDPR access and
// portability). Secrets are left out: password hash, session tokens, API key
// hashes and the encrypted AADE credentials.
export async function GET() {
  const { user, res } = await authed()
  if (res) return res

  const limited = rateLimit(`account-export:${user.id}`, 10, 60 * 60_000)
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)

  const where = { userId: user.id }
  const [settings, employees, clients, entries, apiKeys, aade, invoices, syncLogs, categoryAudits] = await Promise.all([
    prisma.settings.findUnique({ where }),
    prisma.employee.findMany({ where, orderBy: { name: 'asc' } }),
    prisma.client.findMany({ where, orderBy: { name: 'asc' } }),
    prisma.workEntry.findMany({ where, orderBy: { date: 'asc' } }),
    prisma.apiKey.findMany({
      where,
      select: { id: true, name: true, prefix: true, lastUsedAt: true, revokedAt: true, createdAt: true },
    }),
    prisma.aadeConnection.findUnique({
      where,
      select: { environment: true, entityVatNumber: true, lastSyncedAt: true, createdAt: true, updatedAt: true },
    }),
    prisma.invoice.findMany({ where, orderBy: { issueDate: 'asc' }, omit: { rawPayload: true } }),
    prisma.vatSyncLog.findMany({ where, orderBy: { startedAt: 'asc' } }),
    prisma.categoryAuditEvent.findMany({ where, orderBy: { createdAt: 'asc' } }),
  ])

  return jsonDownload(
    {
      exportedAt: new Date().toISOString(),
      format: 'axion-workspace-export/v1',
      account: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      settings,
      employees,
      clients,
      workEntries: entries,
      apiKeys,
      aadeConnection: aade,
      invoices,
      vatSyncLogs: syncLogs,
      categoryAuditEvents: categoryAudits,
    },
    `axion-export-${today()}.json`
  )
}
