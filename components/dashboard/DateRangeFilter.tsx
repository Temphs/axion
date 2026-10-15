'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { DateField } from '@/components/dashboard/DateField'

const dateInputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-700 outline-none focus:border-blue-400 sm:w-36 sm:py-1.5'

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function DateRangeFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''

  function apply(nextFrom: string, nextTo: string, range?: 'all') {
    const q = new URLSearchParams()
    if (range) q.set('range', range)
    if (nextFrom) q.set('from', nextFrom)
    if (nextTo) q.set('to', nextTo)
    const qs = q.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  function preset(kind: 'thisWeek' | 'thisMonth' | 'lastMonth' | 'quarter' | 'ytd' | 'all') {
    const now = new Date()
    // "Όλα" = the full span of recorded entries (first → last), skipping
    // months without data; resolved server-side.
    if (kind === 'all') return apply('', '', 'all')
    if (kind === 'thisWeek') {
      const day = (now.getDay() + 6) % 7 // Monday-based
      return apply(iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)), iso(now))
    }
    if (kind === 'thisMonth') {
      return apply(iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now))
    }
    if (kind === 'lastMonth') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return apply(iso(start), iso(end))
    }
    if (kind === 'quarter') {
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      return apply(iso(qStart), iso(now))
    }
    return apply(iso(new Date(now.getFullYear(), 0, 1)), iso(now)) // ytd
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      {/* Phones: a 3×2 grid that always fits; larger screens: one segmented row. */}
      <div className="grid w-full grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm sm:flex sm:w-auto">
        {([
          ['thisWeek', 'Εβδομάδα'],
          ['thisMonth', 'Μήνας'],
          ['lastMonth', 'Προηγ.'],
          ['quarter', 'Τρίμηνο'],
          ['ytd', 'Έτος'],
          ['all', 'Όλα'],
        ] as const).map(([k, label]) => {
          const active = k === 'all' && params.get('range') === 'all'
          return (
            <button
              key={k}
              onClick={() => preset(k)}
              title={k === 'all' ? 'Όλο το ιστορικό εγγραφών (χωρίς κενούς μήνες)' : undefined}
              className={
                'min-h-[40px] border-b border-r border-slate-100 px-3 py-2 font-medium transition [&:nth-child(3n)]:border-r-0 [&:nth-last-child(-n+3)]:border-b-0 sm:border-b-0 sm:[&:nth-child(3n)]:border-r sm:last:border-r-0 ' +
                (active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600')
              }
            >
              {label}
            </button>
          )
        })}
      </div>
      <div className="flex w-full items-center gap-1.5 text-sm sm:w-auto">
        <DateField value={from} onCommit={(v) => apply(v, to)} ariaLabel="Από" inputClassName={dateInputCls} className="min-w-0 flex-1 sm:flex-none" />
        <span className="text-slate-400">→</span>
        <DateField value={to} onCommit={(v) => apply(from, v)} ariaLabel="Έως" inputClassName={dateInputCls} className="min-w-0 flex-1 sm:flex-none" />
      </div>
    </div>
  )
}
