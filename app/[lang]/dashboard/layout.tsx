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

  return (
    <div className="dashboard-surface min-h-screen text-stone-900">
      <div className="mx-auto flex max-w-[1440px] gap-7 px-4 py-6 lg:px-8">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col justify-between rounded-3xl border border-stone-200/80 bg-white/80 p-4 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_24px_48px_-32px_rgba(28,25,23,0.25)] backdrop-blur-sm lg:flex">
          <div>
            <div className="mb-7 flex items-center gap-3 px-2 pt-1">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 text-lg font-bold text-white shadow-sm">
                A
              </span>
              <div className="leading-tight">
                <div className="font-display text-xl font-semibold tracking-tight">Axion</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Productivity</div>
              </div>
            </div>
            <Nav lang={lang} />
          </div>

          <div className="space-y-3">
            {/* Editorial summary card — fills the sidebar with something useful */}
            <div className="rounded-2xl border border-stone-200/70 bg-gradient-to-br from-stone-50 to-white p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">Σύνοψη</p>
              <div className="space-y-2.5">
                <SummaryRow label="Ώρες σύνολο" value={hrs(summary.hours)} />
                <SummaryRow label="Κόστος μισθών" value={eur(summary.cost)} />
                <SummaryRow label="Πελάτες" value={num(summary.clientCount)} />
                <SummaryRow label="Εργαζόμενοι" value={num(summary.employeeCount)} />
              </div>
            </div>

            <div className="border-t border-stone-100 pt-3">
              <div className="mb-2 flex items-center gap-2.5 px-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600">
                  {(user.name ?? user.email).trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-800">{user.name ?? 'Διαχειριστής'}</p>
                  <p className="truncate text-xs text-stone-400">{user.email}</p>
                </div>
              </div>
              <LogoutButton />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-500 text-sm font-bold text-white">
                A
              </span>
              <span className="font-display text-lg font-semibold tracking-tight">Axion</span>
            </span>
            <LogoutButton />
          </div>
          <div className="mb-4 rounded-2xl border border-stone-200/70 bg-white/80 p-2 shadow-sm backdrop-blur-sm lg:hidden">
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
      <span className="text-xs text-stone-500">{label}</span>
      <span className="font-display text-base font-semibold tabular-nums text-stone-900">{value}</span>
    </div>
  )
}
