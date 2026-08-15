import { ok, fail, authed } from '@/lib/api'
import { invoiceListQuerySchema, parseSearchParams } from '@/services/vat/schemas'
import { listInvoices } from '@/services/vat/queries'

export async function GET(request: Request) {
  const { user, res } = await authed()
  if (res) return res

  const parsed = parseSearchParams(invoiceListQuerySchema, new URL(request.url).searchParams)
  if ('error' in parsed) return fail(parsed.error)

  return ok(await listInvoices(user.id, parsed))
}
