import Link from 'next/link'
import { AlertTriangle, Gauge, Landmark, PiggyBank, Timer, Users } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import type { Insight } from '@/lib/profitability'

const KIND_ICON = {
  client_margin: Landmark,
  utilization: Gauge,
  budget_overrun: Timer,
  pricing: PiggyBank,
  capacity: Users,
} as const

const SEVERITY_CLS = {
  critical: 'border-red-100 bg-red-50/60 text-red-700',
  warning: 'border-amber-100 bg-amber-50/60 text-amber-800',
  info: 'border-slate-100 bg-slate-50/80 text-slate-600',
} as const

// Deterministic, number-backed management alerts (no generated text).
export function AlertsPanel({ insights, lang }: { insights: Insight[]; lang: string }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle size={15} className="text-amber-500" />
        <h2 className="text-sm font-semibold text-slate-900">Ειδοποιήσεις διοίκησης</h2>
        <span className="text-xs text-slate-400">βάσει κανόνων στα πραγματικά νούμερα</span>
      </div>
      {insights.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">
          Κανένα εύρημα για την περίοδο — όλα εντός ορίων.
        </p>
      ) : (
        <ul className="space-y-2">
          {insights.map((ins, i) => {
            const Icon = KIND_ICON[ins.kind]
            const body = (
              <span className="flex items-start gap-2.5">
                <Icon size={14} className="mt-0.5 shrink-0 opacity-70" />
                <span className="text-[13px] leading-snug">{ins.message}</span>
              </span>
            )
            return (
              <li key={i} className={`rounded-xl border px-3.5 py-2.5 ${SEVERITY_CLS[ins.severity]}`}>
                {ins.href ? (
                  <Link href={`/${lang}/dashboard/${ins.href}`} className="block transition hover:opacity-80">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
