'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function DateRangeFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''

  function apply(nextFrom: string, nextTo: string) {
    const q = new URLSearchParams()
    if (nextFrom) q.set('from', nextFrom)
    if (nextTo) q.set('to', nextTo)
    const qs = q.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  function preset(kind: 'thisMonth' | 'lastMonth' | 'ytd' | 'all') {
    const now = new Date()
    if (kind === 'all') return apply('', '')
    if (kind === 'thisMonth') {
      return apply(iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now))
    }
    if (kind === 'lastMonth') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return apply(iso(start), iso(end))
    }
    return apply(iso(new Date(now.getFullYear(), 0, 1)), iso(now)) // ytd
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
        {([
          ['thisMonth', 'Μήνας'],
          ['lastMonth', 'Προηγ.'],
          ['ytd', 'Έτος'],
          ['all', 'Όλα'],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => preset(k)}
            className="border-r border-slate-100 px-3 py-2 font-medium text-slate-600 transition last:border-0 hover:bg-slate-50 hover:text-blue-600"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        <input
          type="date"
          key={`from-${from}`}
          defaultValue={from}
          onChange={(e) => { if (e.target.value) apply(e.target.value, to) }}
          onBlur={(e) => { if (!e.target.value && from) apply('', to) }}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 outline-none focus:border-blue-400"
        />
        <span className="text-slate-400">→</span>
        <input
          type="date"
          key={`to-${to}`}
          defaultValue={to}
          onChange={(e) => { if (e.target.value) apply(from, e.target.value) }}
          onBlur={(e) => { if (!e.target.value && to) apply(from, '') }}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 outline-none focus:border-blue-400"
        />
      </div>
    </div>
  )
}
