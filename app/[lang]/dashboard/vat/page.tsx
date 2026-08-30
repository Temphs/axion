import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { isModuleEnabled } from '@/lib/modules'
import { getVatSummary, getVatPrediction, listInvoices } from '@/services/vat/queries'
import { resolveAadeConnection } from '@/services/aade/credentials'
import { invoiceListQuerySchema, summaryQuerySchema, parseSearchParams } from '@/services/vat/schemas'
import { VatDashboard } from '@/components/vat/VatDashboard'

// Server component: loads the VAT overview + invoice list according to the
// URL filters. The client component mutates (sync, overrides) and refreshes.
export default async function VatAnalysisPage({ params, searchParams }: PageProps<'/[lang]/dashboard/vat'>) {
  // Hidden from the nav when the module is off; also unreachable by URL, so a
  // MyEmployee-only deployment can't be walked into a page whose tables it
  // was never provisioned with.
  if (!isModuleEnabled('vat')) notFound()

  const { lang } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/${lang}/login`)

  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === 'string' && value !== '') sp.set(key, value)
  }

  const basisParsed = parseSearchParams(summaryQuerySchema, sp)
  const basis = 'error' in basisParsed ? ('quarter' as const) : basisParsed.basis
  const filtersParsed = parseSearchParams(invoiceListQuerySchema, sp)
  const filters = 'error' in filtersParsed ? { page: 1, pageSize: 25 } : filtersParsed

  const connection = await resolveAadeConnection(user.id)
  const [summary, prediction] = await Promise.all([
    getVatSummary(user.id, basis, {
      configured: connection.source !== 'none',
      source: connection.source,
      environment: connection.environment,
      lastSyncedAt: connection.lastSyncedAt,
    }),
    getVatPrediction(user.id, basis),
  ])
  // The table defaults to the current period unless the user filtered dates.
  const invoices = await listInvoices(user.id, {
    ...filters,
    from: filters.from ?? summary.period.start.slice(0, 10),
  })

  return <VatDashboard basis={basis} summary={summary} prediction={prediction} invoiceList={invoices} />
}
