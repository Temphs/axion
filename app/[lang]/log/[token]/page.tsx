import { notFound } from 'next/navigation'
import { getLogPageData } from '@/lib/employeeLog'
import { WorkLogForm } from '@/components/worklog/WorkLogForm'

// Public page — no session, no dashboard chrome. An employee reaches this
// straight from a link the manager sent them (SMS, Viber, a pinned message),
// so it has to stand on its own: who this is for, and one thing to do.
export default async function WorkLogPage({ params }: PageProps<'/[lang]/log/[token]'>) {
  const { token } = await params
  const data = await getLogPageData(token)
  if (!data) notFound()

  return (
    <div className="dashboard-surface flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-base font-bold text-white shadow-md shadow-blue-900/30">
            A
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-white">Axion</span>
        </div>

        {data.employee.active ? (
          <WorkLogForm token={token} employeeName={data.employee.name} clients={data.clients} initialRecent={data.recent} />
        ) : (
          <div className="rounded-3xl border border-white/40 bg-white/95 p-8 text-center shadow-xl backdrop-blur-md">
            <h1 className="font-display text-lg font-semibold text-slate-900">Ο λογαριασμός είναι ανενεργός</h1>
            <p className="mt-2 text-sm text-slate-500">Επικοινώνησε με τον λογιστή σου για να ενεργοποιηθεί ξανά.</p>
          </div>
        )}
      </div>
    </div>
  )
}
