'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Eyebrow } from './ui'
import { Reveal } from './motion'
import { useI18n } from './i18n'

const barHeights = [42, 38, 55, 46, 58, 52, 65, 72, 68, 80, 75, 90]
const barLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function DashboardPreview() {
  const { dict } = useI18n()
  const t = dict.dashboardPreview

  return (
    <section id="dashboard-preview" className="scroll-mt-20 bg-slate-50/60 px-4 py-16 sm:px-6 sm:py-28">
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
            {/* Mock browser chrome */}
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <span className="ml-3 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-400">
                app.axion.io / overview
              </span>
            </div>

            {/* Dashboard content */}
            <div className="p-5 sm:p-8">
              {/* Header row */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{t.overviewLabel}</div>
                  <div className="text-xs text-slate-400">{t.overviewSub}</div>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  {t.liveLabel}
                </span>
              </div>

              {/* Metrics grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {t.metrics.map((m) => {
                  const isGreen = m.color === 'green'
                  const isRed = m.color === 'red'
                  const isAmber = m.color === 'amber'
                  return (
                    <div
                      key={m.label}
                      className={`rounded-xl border p-4 ${
                        isAmber
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-slate-100 bg-slate-50/60'
                      }`}
                    >
                      <div className="text-xs font-medium text-slate-500">{m.label}</div>
                      <div className="mt-1.5 text-xl font-bold tracking-tight text-slate-900">
                        {m.value}
                      </div>
                      <div
                        className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                          isGreen ? 'text-emerald-600' : isRed ? 'text-red-500' : 'text-amber-600'
                        }`}
                      >
                        {isGreen && <TrendingUp className="h-3 w-3" />}
                        {isRed && <TrendingDown className="h-3 w-3" />}
                        {isAmber && <Minus className="h-3 w-3" />}
                        {m.trend}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Bar chart */}
              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="mb-3 text-xs font-semibold text-slate-500">{t.trendLabel}</div>
                <div className="flex items-end gap-1" style={{ height: 64 }}>
                  {barHeights.map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t-sm ${i >= 10 ? 'bg-blue-200' : 'bg-blue-500'}`}
                      style={{ height: `${(h / 90) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between">
                  {[0, 5, 11].map((i) => (
                    <span key={i} className="text-[10px] text-slate-400">
                      {barLabels[i]}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Note bar */}
            <div className="border-t border-slate-100 px-6 py-2.5 text-center text-[11px] text-slate-400">
              {t.note}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
