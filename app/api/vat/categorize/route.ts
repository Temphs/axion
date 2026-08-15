import { ok, fail, authed, readJson } from '@/lib/api'
import { rateLimit } from '@/lib/rateLimit'
import { categorizeRequestSchema } from '@/services/vat/schemas'
import { recategorizeInvoices } from '@/services/vat/queries'

// Re-runs the categorization engine. Manual overrides are never touched.
export async function POST(request: Request) {
  const { user, res } = await authed()
  if (res) return res

  const limited = rateLimit(`vat-categorize:${user.id}`, 5, 60_000)
  if (!limited.ok) {
    return Response.json(
      { error: 'Too many categorization requests — try again shortly' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
    )
  }

  const body = (await readJson(request)) ?? {}
  const parsed = categorizeRequestSchema.safeParse(body)
  if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join('; '))

  const updated = await recategorizeInvoices(user.id, parsed.data.scope)
  return ok({ updated })
}
