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

  const summary = await getSidebarSummary(user.id)
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
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col justify-between overflow-hidden rounded-3xl border border-white/40 bg-white/95 p-4 shadow-[0_1px_3px_rgba(0,0,40,0.12),0_24px_48px_-16px_rgba(0,0,40,0.35)] backdrop-blur-md lg:flex">
          {/* Brand + navigation — the part that gives way when space is tight */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mb-5 flex items-center gap-3 px-2 pt-1">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white shadow-md shadow-blue-900/30">
                A
              </span>
              <div className="leading-tight">
                <div className="font-display text-[1.1rem] font-bold tracking-tight text-slate-900">Axion</div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Financial Intelligence</div>
              </div>
            </div>

            <Nav lang={lang} />
          </div>

          {/* Bottom section — always visible, never clipped */}
          <div className="shrink-0 space-y-3 pt-3">
            {/* Summary card */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Σύνοψη
              </p>
              <div className="space-y-2">
                <SummaryRow label="Ώρες σύνολο" value={hrs(summary.hours)} />
                <SummaryRow label="Κόστος μισθών" value={eur(summary.cost)} />
                <SummaryRow label="Πελάτες" value={num(summary.clientCount)} />
                <SummaryRow label="Εργαζόμενοι" value={num(summary.employeeCount)} />
              </div>
            </div>

            {/* User row */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900" title={user.name ?? undefined}>
                    {user.name ?? 'Διαχειριστής'}
                  </p>
                  <p className="truncate text-[11px] text-slate-400" title={user.email}>{user.email}</p>
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
          <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-white/40 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md lg:hidden">
            <span className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-sm">
                A
              </span>
              <span className="font-display text-base font-bold tracking-tight text-slate-900">Axion</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700">
                {initials}
              </span>
              <LogoutButton />
            </div>
          </div>
          {/* Mobile nav */}
          <div className="mb-4 overflow-hidden rounded-2xl border border-white/40 bg-white/95 p-2 shadow-sm backdrop-blur-md lg:hidden">
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
      <span className="text-xs text-slate-500">{label}</span>
      <span className="font-display text-sm font-bold tabular-nums text-slate-900">{value}</span>
    </div>
  )
}
