'use client'

import { Briefcase, ClipboardCheck, Clock, TriangleAlert, Wallet } from 'lucide-react'
import { Eyebrow } from './ui'
import { Reveal } from './motion'
import { useI18n } from './i18n'

// The owner's whole screen: four numbers, which clients pay for themselves, and
// where the hours went. Nothing here needs a BI analyst to read.
const metricIcons = [Clock, Wallet, Briefcase, ClipboardCheck]

export function DashboardPreview() {
  const { dict } = useI18n()
  const t = dict.ownerDashboard

  return (
    <section id="dashboard" className="scroll-mt-20 bg-slate-50/60 px-4 py-16 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h2
            className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
          >
            {t.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            {t.subtitle}
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="pointer-events-none relative mx-auto mt-12 max-w-5xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_40px_80px_-30px_rgba(15,23,42,0.18)]">
            {/* browser chrome */}
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <span className="ml-3 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-400">
                {t.address}
              </span>
            </div>

            <div className="p-4 sm:p-7">
              <div className="mb-4 text-xs text-slate-400">{t.period}</div>

              {/* four numbers */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {t.metrics.map((m, i) => {
                  const Icon = metricIcons[i]
                  return (
                    <div key={m.label} className="rounded-xl border border-slate-100 bg-white p-4">
                      <div className="mb-2 flex items-center gap-1.5 text-slate-400">
                        <Icon className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-[11px] font-medium">{m.label}</span>
                      </div>
                      <div className="text-xl font-bold tracking-tight text-slate-900">{m.value}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">{m.sub}</div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-5">
                {/* client profitability */}
                <div className="overflow-hidden rounded-xl border border-slate-100 lg:col-span-3">
                  <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                    <div className="text-xs font-semibold text-slate-900">{t.profitabilityTitle}</div>
                    <div className="text-[11px] text-slate-400">{t.profitabilitySub}</div>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[9px] uppercase tracking-wide text-slate-400">
                        {t.columns.map((c, i) => (
                          <th
                            key={c}
                            className={`px-3 py-2 font-medium ${i > 0 ? 'text-right' : ''} ${
                              i === 2 || i === 3 ? 'hidden sm:table-cell' : ''
                            }`}
                          >
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {t.rows.map((r) => (
                        <tr
                          key={r.name}
                          className={`border-t border-slate-50 ${r.watch ? 'bg-amber-50/60' : ''}`}
                        >
                          <td className="px-3 py-2.5">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-medium text-slate-800">{r.name}</span>
                              {r.watch && <TriangleAlert className="h-3 w-3 shrink-0 text-amber-500" />}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs tabular-nums text-slate-600">{r.fee}</td>
                          <td className="hidden px-3 py-2.5 text-right text-xs tabular-nums text-slate-500 sm:table-cell">
                            {r.hours}
                          </td>
                          <td className="hidden px-3 py-2.5 text-right text-xs tabular-nums text-slate-500 sm:table-cell">
                            {r.cost}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-semibold tabular-nums text-slate-900">
                            {r.contribution}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span
                              className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                                r.watch ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {r.margin}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-400">
                    {t.formula}
                  </div>
                </div>

                {/* where the time went */}
                <div className="rounded-xl border border-slate-100 p-4 lg:col-span-2">
                  <div className="text-xs font-semibold text-slate-900">{t.timeTitle}</div>
                  <div className="mb-3 text-[11px] text-slate-400">{t.timeSub}</div>
                  <div className="space-y-2.5">
                    {t.timeRows.map((row) => (
                      <div key={row.name}>
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <span className="truncate pr-2 text-slate-600">{row.name}</span>
                          <span className="shrink-0 tabular-nums font-medium text-slate-700">{row.hours}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                            style={{ width: `${row.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
