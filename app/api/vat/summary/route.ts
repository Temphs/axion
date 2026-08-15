import { ok, fail, authed } from '@/lib/api'
import { summaryQuerySchema, parseSearchParams } from '@/services/vat/schemas'
import { getVatSummary } from '@/services/vat/queries'
import { resolveAadeConnection } from '@/services/aade/credentials'

export async function GET(request: Request) {
  const { user, res } = await authed()
  if (res) return res

  const parsed = parseSearchParams(summaryQuerySchema, new URL(request.url).searchParams)
  if ('error' in parsed) return fail(parsed.error)

  const connection = await resolveAadeConnection(user.id)
  const summary = await getVatSummary(user.id, parsed.basis, {
    configured: connection.source !== 'none',
    source: connection.source,
    environment: connection.environment,
    lastSyncedAt: connection.lastSyncedAt,
  })
  return ok(summary)
}
