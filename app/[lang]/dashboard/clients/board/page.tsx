import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { parseStatsFilter } from '@/lib/stats'
import { buildWorkforce } from '@/lib/workforce'
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter'
import { ClientPaymentCards } from '@/components/workforce/ClientPaymentCards'
import { resolveClientPayments } from '@/lib/payments'

// Client profitability board — the analytical counterpart to the client
// management list, reachable from its own sidebar entry.
export default async function ClientBoardPage({ params, searchParams }: PageProps<'/[lang]/dashboard/clients/board'>) {
  const { lang } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/${lang}/login`)

  const sp = await searchParams
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) if (typeof v === 'string') usp.set(k, v)
  const parsed = parseStatsFilter(usp)
  const filter = 'error' in parsed ? {} : parsed.filter

  const wf = await buildWorkforce(user.id, {
    from: filter.from,
    to: filter.to,
    all: usp.get('range') === 'all',
  })

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Πίνακας πελατών</h1>
          <p className="mt-0.5 text-sm text-blue-200/80">Ώρες, κόστος εργασίας και περιθώριο για κάθε πελάτη</p>
        </div>
        <DateRangeFilter />
      </header>

      <ClientPaymentCards
        clients={wf.clients}
        payments={wf.clients.map((c) => resolveClientPayments(c.id, c.monthlyRevenue))}
        attention={wf.attention}
        lang={lang}
      />
    </div>
  )
}
