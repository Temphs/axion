import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getSidebarSummary } from '@/lib/stats'
import { Nav } from '@/components/dashboard/Nav'
import { LogoutButton } from '@/components/dashboard/LogoutButton'
import { eur, hrs, num } from '@/lib/format'

export default async function DashboardLayout({ children, params }: LayoutProps<'/[lang]/dashboard'>) {
  const { lang } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/${lang}/login`)

  const summary = await getSidebarSummary()
  const initials = (user.name ?? user.email)
    .trim()
    .split(/\s+/)
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')

  return (
    <div className="dashboard-surface min-h-screen">
      <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-6 lg:px-8">

        {/* ── Desktop sidebar ─────────────────────────────────── */}
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.07] p-4 shadow-[0_1px_3px_rgba(0,0,40,0.15),0_24px_48px_-16px_rgba(0,0,40,0.4)] backdrop-blur-md lg:flex">
          {/* Brand */}
          <div>
            <div className="mb-7 flex items-center gap-3 px-2 pt-1">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 text-lg font-bold text-white shadow-md shadow-blue-900/40">
                A
              </span>
              <div className="leading-tight">
                <div className="font-display text-[1.1rem] font-bold tracking-tight text-white">Axion</div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-blue-200/60">Financial Intelligence</div>
              </div>
            </div>

            <Nav lang={lang} />
          </div>

          {/* Bottom section */}
          <div className="space-y-3">
            {/* Summary card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200/50">
                Σύνοψη
              </p>
              <div className="space-y-2.5">
                <SummaryRow label="Ώρες σύνολο" value={hrs(summary.hours)} />
                <SummaryRow label="Κόστος μισθών" value={eur(summary.cost)} />
                <SummaryRow label="Πελάτες" value={num(summary.clientCount)} />
                <SummaryRow label="Εργαζόμενοι" value={num(summary.employeeCount)} />
              </div>
            </div>

            {/* User row */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-xs font-bold text-white shadow-sm">
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{user.name ?? 'Διαχειριστής'}</p>
                  <p className="truncate text-[11px] text-blue-200/60">{user.email}</p>
                </div>
              </div>
              <div className="mt-2.5">
                <LogoutButton />
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main content ────────────────────────────────────── */}
        <main className="min-w-0 flex-1">
          {/* Mobile header */}
          <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 shadow-sm backdrop-blur-md lg:hidden">
            <span className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 text-sm font-bold text-white shadow-sm">
                A
              </span>
              <span className="font-display text-base font-bold tracking-tight text-white">Axion</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-[11px] font-bold text-white">
                {initials}
              </span>
              <LogoutButton />
            </div>
          </div>
          {/* Mobile nav */}
          <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-sm backdrop-blur-md lg:hidden">
            <Nav lang={lang} orientation="horizontal" />
          </div>

          {children}
        </main>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-blue-100/50">{label}</span>
      <span className="font-display text-sm font-bold tabular-nums text-white">{value}</span>
    </div>
  )
}
