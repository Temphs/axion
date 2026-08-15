import { ok, fail, authed, readJson } from '@/lib/api'
import { rateLimit } from '@/lib/rateLimit'
import { syncRequestSchema } from '@/services/vat/schemas'
import { syncInvoices } from '@/services/aade/sync'

// Triggers a myDATA sync for the current tenant. Expensive upstream call, so
// it is rate limited per user (the AADE side has its own quotas too).
export async function POST(request: Request) {
  const { user, res } = await authed()
  if (res) return res

  const limited = rateLimit(`vat-sync:${user.id}`, 3, 60_000)
  if (!limited.ok) {
    return Response.json(
      { error: 'Too many sync requests — try again shortly', retryAfterSeconds: limited.retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
    )
  }

  const body = (await readJson(request)) ?? {}
  const parsed = syncRequestSchema.safeParse(body)
  if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join('; '))

  const outcome = await syncInvoices(user.id, {
    dateFrom: parsed.data.dateFrom ? new Date(`${parsed.data.dateFrom}T00:00:00Z`) : undefined,
    dateTo: parsed.data.dateTo ? new Date(`${parsed.data.dateTo}T00:00:00Z`) : undefined,
  })

  if (outcome.status === 'not_configured') {
    return fail('AADE connection is not configured', 409)
  }
  if (outcome.status === 'error') {
    return Response.json(
      { error: 'Sync failed', errorCode: outcome.errorCode, environment: outcome.environment },
      { status: 502 }
    )
  }
  return ok(outcome)
}
