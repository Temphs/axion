import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Nav } from '@/components/dashboard/Nav'
import { LogoutButton } from '@/components/dashboard/LogoutButton'

export default async function DashboardLayout({ children, params }: LayoutProps<'/[lang]/dashboard'>) {
  const { lang } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/${lang}/login`)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-6 lg:px-8">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm lg:flex">
          <div>
            <div className="mb-6 flex items-center gap-2.5 px-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
                A
              </span>
              <span className="text-lg font-bold tracking-tight">Axion</span>
            </div>
            <Nav lang={lang} />
          </div>
          <div className="border-t border-slate-100 pt-3">
            <div className="mb-2 px-3.5">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name ?? 'Διαχειριστής'}</p>
              <p className="truncate text-xs text-slate-400">{user.email}</p>
            </div>
            <LogoutButton />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <span className="flex items-center gap-2 font-bold tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                A
              </span>
              Axion
            </span>
            <LogoutButton />
          </div>
          <div className="mb-4 rounded-2xl border border-slate-200/70 bg-white p-2 shadow-sm lg:hidden">
            <Nav lang={lang} orientation="horizontal" />
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
