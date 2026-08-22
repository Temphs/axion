import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Activity, Briefcase, Clock, Info, Wallet } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter'
import { KpiCard } from '@/components/workforce/KpiCard'
import { TeamOverviewTable } from '@/components/workforce/TeamOverviewTable'
import { TopClientsList } from '@/components/workforce/TopClientsList'
import { EntryCompletenessSection } from '@/components/workforce/EntryCompletenessPanel'
import { ClientPaymentCards } from '@/components/workforce/ClientPaymentCards'
import { getCurrentUser } from '@/lib/auth'
import { buildWorkforce } from '@/lib/workforce'
import { parseStatsFilter } from '@/lib/stats'
import { percentChange } from '@/lib/profitability'
import { resolveClientPayments } from '@/lib/payments'
import { eur, hrs, num, pct } from '@/lib/format'

// The owner dashboard. Four numbers, the team's workload, where the time and
// money went, what needs a look, and whether each fee covers its work.
export default async function DashboardOverview({ params, searchParams }: PageProps<'/[lang]/dashboard'>) {
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
  const { summary, previousSummary: prev } = wf
  const empty = summary.hours === 0

  const periodName = new Intl.DateTimeFormat('el-GR', { month: 'long', year: 'numeric' }).format(new Date(wf.period.from))
  const periodLabel = wf.period.all
    ? `Όλο το ιστορικό · ${wf.period.months} μήνες με δεδομένα`
    : filter.from || filter.to
      ? 'Επιλεγμένη περίοδος'
      : periodName

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">MyEmployee</h1>
          <p className="mt-0.5 text-sm text-blue-200/80">Πού πηγαίνει ο χρόνος της ομάδας και τι κοστίζει ανά πελάτη</p>
        </div>
        <DateRangeFilter />
      </header>

      {/* period + data-collected line */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-200/70">
        <span>{periodLabel}</span>
        {wf.trackingSince && (
          <span>
            Καταγραφή από {new Date(wf.trackingSince).toLocaleDateString('el-GR')} · {num(wf.trackingDays)} ημέρες δεδομένων
          </span>
        )}
      </div>

      {empty ? (
        <Card className="p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <Activity className="h-7 w-7 text-blue-600" />
          </div>
          <p className="text-lg font-semibold text-slate-900">Δεν υπάρχουν καταχωρήσεις εργασίας στην περίοδο</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Προσθέστε εργαζόμενους και πελάτες, και συνδέστε την εφαρμογή καταγραφής χρόνου μέσω API key ή καταχωρήστε χειροκίνητα.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href={`/${lang}/dashboard/employees`} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500">
              Εργαζόμενοι
            </Link>
            <Link href={`/${lang}/dashboard/clients`} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Πελάτες
            </Link>
            <Link href={`/${lang}/dashboard/entries`} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Καταχωρήσεις
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {summary.revenue === 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div className="text-sm">
                <span className="font-semibold text-amber-800">Δεν έχουν οριστεί αμοιβές πελατών.</span>{' '}
                <span className="text-amber-700">Χωρίς αυτές δεν υπολογίζονται συνεισφορά και περιθώριο.</span>
              </div>
              <Link href={`/${lang}/dashboard/clients`} className="ml-auto shrink-0 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-200">
                Πελάτες →
              </Link>
            </div>
          )}

          {/* ── The four numbers ────────────────────────────────── */}
          {/* The completeness card opens the per-employee breakdown beneath
              the row: expected vs logged days, and which days are missing. */}
          <EntryCompletenessSection
            rows={wf.completenessByEmployee}
            value={wf.entryCompleteness !== null ? pct(wf.entryCompleteness) : '—'}
            sub={
              wf.entryCompleteness !== null
                ? `${num(wf.expectedWorkingDays)} εργάσιμες ημέρες · δείτε ανά άτομο`
                : 'Χρειάζονται ενεργοί εργαζόμενοι'
            }
            tooltip="Ημέρες με καταχώρηση ÷ εργάσιμες ημέρες (Δευ–Παρ) της περιόδου, κατά μέσο όρο ανά ενεργό εργαζόμενο. Δεν γνωρίζει άδειες."
          >
            <KpiCard
              icon={Clock}
              label="Ώρες ομάδας"
              value={hrs(summary.hours)}
              sub={`${num(summary.employeeCount)} άτομα κατέγραψαν χρόνο`}
              delta={percentChange(summary.hours, prev?.hours)}
              tooltip="Σύνολο καταγεγραμμένων ωρών στην περίοδο."
            />
            <KpiCard
              icon={Wallet}
              label="Κόστος εργασίας"
              value={eur(summary.laborCost)}
              sub={summary.billableShare !== null ? `${pct(summary.billableShare)} σε χρεώσιμους πελάτες` : undefined}
              delta={percentChange(summary.laborCost, prev?.laborCost)}
              invert
              tooltip="Ώρες × ωριαίο κόστος κάθε εργαζόμενου (μισθός ÷ συμβατικές ώρες)."
            />
            <KpiCard
              icon={Briefcase}
              label="Ενεργοί πελάτες"
              value={num(wf.activeClientCount)}
              sub={`${num(summary.clientCount)} με δραστηριότητα στην περίοδο`}
              tooltip="Πελάτες σημειωμένοι ως ενεργοί στην καρτέλα πελατών."
            />
          </EntryCompletenessSection>

          {/* ── Team ────────────────────────────────────────────── */}
          <TeamOverviewTable employees={wf.employees} lang={lang} />

          {/* ── Where time and money went ───────────────────────── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <TopClientsList clients={wf.clients} previousHours={wf.previousClientHours} metric="hours" lang={lang} />
            <TopClientsList clients={wf.clients} metric="laborCost" lang={lang} />
          </div>

          {/* ── Does the fee cover the work? ────────────────────── */}
          {/* Warnings appear on the client they belong to, rather than in a
              separate notifications panel. */}
          <ClientPaymentCards
            clients={wf.clients}
            payments={wf.clients.map((c) => resolveClientPayments(c.id, c.monthlyRevenue))}
            attention={wf.attention}
            lang={lang}
            limit={6}
            moreHref={`/${lang}/dashboard/clients/board`}
          />
        </>
      )}
    </div>
  )
}
