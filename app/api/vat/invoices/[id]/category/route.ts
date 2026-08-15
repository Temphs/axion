import { ok, fail, authed, readJson } from '@/lib/api'
import { categoryOverrideSchema } from '@/services/vat/schemas'
import { applyCategoryOverride } from '@/services/vat/queries'

// Manual category override — the accountant's decision always wins over the
// engine. Every change is recorded in CategoryAuditEvent.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, res } = await authed()
  if (res) return res

  const { id } = await params
  const body = await readJson(request)
  if (!body) return fail('Invalid JSON body')

  const parsed = categoryOverrideSchema.safeParse(body)
  if (!parsed.success) return fail(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '))

  const updated = await applyCategoryOverride(user.id, id, parsed.data)
  if (!updated) return fail('Invoice not found', 404)
  return ok(updated)
}
