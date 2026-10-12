'use client'

import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { BarChart, Donut } from './charts'
import { AppWindow, MockCard, useMockFormat } from './AppFrame'
import { Eyebrow } from './ui'
import { Reveal } from './motion'
import { useI18n } from './i18n'

// Demo replica of the VAT Analysis page (components/vat/VatDashboard.tsx):
// prediction card, the four VAT stat cards, the per-period trend and the
// category breakdown. Figures are illustrative and internally consistent
// (net VAT = output VAT − deductible input VAT).

const OUTPUT_VAT = 9120
const INPUT_VAT = 5180
const TREND: Array<[number, number]> = [
  [7400, 4300],
  [8100, 4700],
  [7800, 4900],
  [8600, 4800],
  [8900, 5000],
  [OUTPUT_VAT, INPUT_VAT],
]
const DONUT_COLORS = ['#2563EB', '#7C3AED', '#0891B2', '#D97706']
const CATEGORY_VAT = [6240, 3200, 2880, 1980] // two income, two expense categories

export function DashboardPreview() {
  const { dict } = useI18n()
  const t = dict.dashboardPreview
  const f = useMockFormat()
  const net = OUTPUT_VAT - INPUT_VAT

  const stats = [
    { title: t.stats[0].title, value: f.eur(net, true), sub: t.stats[0].sub, icon: TrendingUp, tone: 'bg-amber-50 text-amber-600' },
    { title: t.stats[1].title, value: f.eur(OUTPUT_VAT, true), sub: t.stats[1].sub, icon: ArrowUpCircle, tone: 'bg-blue-50 text-blue-600' },
    { title: t.stats[2].title, value: f.eur(INPUT_VAT, true), sub: t.stats[2].sub, icon: ArrowDownCircle, tone: 'bg-violet-50 text-violet-600' },
    { title: t.stats[3].title, value: '3', sub: t.stats[3].sub, icon: AlertTriangle, tone: 'bg-red-50 text-red-500' },
  ]

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
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">{t.subtitle}</p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="pointer-events-none relative mx-auto mt-12 max-w-5xl">
            <AppWindow address={t.address} active="vat" className="shadow-[0_40px_80px_-30px_rgba(15,23,42,0.18)]">
              {/* header */}
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-0.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow-lg shadow-violet-900/40">
                    <BarChart3 className="h-4 w-4" />
                  </span>
                  <div>
                    <p
                      className="text-base font-bold leading-tight tracking-tight text-white sm:text-xl"
                      style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
                    >
                      VAT Analysis
                    </p>
                    <p className="text-[10px] text-blue-200/80">{t.subtitleApp}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="hidden overflow-hidden rounded-lg border border-white/15 text-[9px] font-semibold sm:flex">
                    <span className="bg-violet-600 px-2 py-1 text-white">{t.basis[0]}</span>
                    <span className="bg-white/10 px-2 py-1 text-blue-100/70">{t.basis[1]}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-[9px] font-semibold text-white shadow-md">
                    <RefreshCw className="h-3 w-3" /> {t.sync}
                  </span>
                </div>
              </div>
              <p className="mb-2 flex items-center gap-1 px-0.5 text-[9px] text-blue-200/70">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" /> {t.syncStatus}
              </p>

              {/* prediction */}
              <MockCard className="p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px] font-semibold text-slate-900">{t.predictionTitle}</p>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-px text-[8px] font-semibold text-emerald-700">
                        {t.confidence}
                      </span>
                    </div>
                    <p className="mt-1 flex items-baseline gap-1.5">
                      <span
                        className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
                        style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
                      >
                        {f.eur(4860, true)}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500">{t.payableLabel}</span>
                    </p>
                    <p className="mt-0.5 text-[9px] text-slate-400">
                      {t.rangeLabel}: {f.eur(4310, true)} – {f.eur(5420, true)} · {t.daysLeft}
                    </p>
                  </div>
                  <div className="flex max-w-[15rem] items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[9px] leading-snug text-amber-800">
                    <AlertTriangle className="mt-px h-3 w-3 shrink-0 text-amber-500" />
                    <span>
                      <strong>{t.warningTitle}</strong> {t.warning}
                    </span>
                  </div>
                </div>
                <p className="mt-2 flex items-center gap-1 text-[8px] text-slate-400">
                  <ShieldCheck className="h-3 w-3" /> {t.disclaimer}
                </p>
              </MockCard>

              {/* stat cards */}
              <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
                {stats.map(({ title, value, sub, icon: Icon, tone }) => (
                  <MockCard key={title} className="p-2.5">
                    <div className="flex items-start gap-1.5">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${tone}`}>
                        <Icon className="h-3 w-3" />
                      </span>
                      <span className="text-[9px] font-medium leading-tight text-slate-600">{title}</span>
                    </div>
                    <p className="mt-1.5 text-sm font-bold tabular-nums tracking-tight text-slate-900 sm:text-base">{value}</p>
                    <p className="truncate text-[8.5px] text-slate-400">{sub}</p>
                  </MockCard>
                ))}
              </div>

              {/* charts */}
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <MockCard className="p-3">
                  <p className="text-[11px] font-semibold text-slate-900">{t.trendTitle}</p>
                  <p className="text-[9px] text-slate-400">{t.trendSub}</p>
                  <BarChart groups={TREND} className="mt-1" />
                  <div className="flex items-center gap-3 text-[9px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-3 rounded-sm bg-blue-600" /> {t.legend[0]}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-3 rounded-sm bg-blue-200" /> {t.legend[1]}
                    </span>
                  </div>
                </MockCard>

                <MockCard className="hidden p-3 sm:block">
                  <p className="text-[11px] font-semibold text-slate-900">{t.breakdownTitle}</p>
                  <p className="mb-2 text-[9px] text-slate-400">{t.breakdownSub}</p>
                  <div className="flex items-center gap-3">
                    <Donut
                      className="w-24 shrink-0"
                      segments={CATEGORY_VAT.map((v, i) => ({ value: v, color: DONUT_COLORS[i] }))}
                    />
                    <ul className="min-w-0 flex-1 space-y-1 text-[9px]">
                      {t.categories.map((c, i) => (
                        <li key={c} className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1 text-slate-600">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i] }} />
                            <span className="truncate">{c}</span>
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums text-slate-800">
                            {f.eur(CATEGORY_VAT[i], true)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </MockCard>
              </div>
            </AppWindow>
            <p className="mt-3 text-center text-[11px] text-slate-400">{t.note}</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
