import { ok, authed } from '@/lib/api'
import { listInvoices } from '@/services/vat/queries'

// Invoices the categorization engine wasn't confident about, oldest debt first.
export async function GET() {
  const { user, res } = await authed()
  if (res) return res

  return ok(await listInvoices(user.id, { needsReview: true, page: 1, pageSize: 100 }))
}
