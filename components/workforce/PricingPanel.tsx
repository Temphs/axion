import Link from 'next/link'
import { BadgeEuro } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { eur, hrs, pct } from '@/lib/format'
import type { PricingOpportunity } from '@/lib/profitability'

// Clients whose numbers suggest the fee no longer matches the effort.
export function PricingPanel({ pricing, lang }: { pricing: PricingOpportunity[]; lang: string }) {
  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center gap-2">
        <BadgeEuro size={15} className="text-blue-600" />
        <h2 className="text-sm font-semibold text-slate-900">Ευκαιρίες ανατιμολόγησης</h2>
      </div>
      <p className="mb-4 text-xs text-slate-400">Πελάτες όπου η αμοιβή υπολείπεται σημαντικά του χρόνου που καταναλώνουν</p>
      {pricing.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">
          Καμία ένδειξη υποτιμολόγησης στην περίοδο.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {pricing.map((p) => (
            <li key={p.clientId} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/${lang}/dashboard/clients/${p.clientId}`}
                  className="text-sm font-semibold text-slate-800 transition hover:text-blue-600"
                >
                  {p.name}
                </Link>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  Εξετάστε ανατιμολόγηση
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] tabular-nums text-slate-500">
                <span>Έσοδα: <strong className="text-slate-700">{eur(p.revenue)}</strong></span>
                <span>Ώρες: <strong className="text-slate-700">{hrs(p.hours)}</strong></span>
                {p.revenuePerHour !== null && (
                  <span>€/ώρα: <strong className="text-slate-700">{eur(p.revenuePerHour, true)}</strong></span>
                )}
                {p.margin !== null && (
                  <span>Περιθώριο: <strong className="text-slate-700">{pct(p.margin)}</strong></span>
                )}
              </div>
              <ul className="mt-1.5 list-disc pl-4 text-[11px] text-slate-500">
                {p.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
