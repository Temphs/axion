'use client'

import { motion } from 'framer-motion'
import { Activity, AlertTriangle, Briefcase, CircleDollarSign, Clock, Gauge, Landmark, TrendingUp, Users, Wallet } from 'lucide-react'
import { AppWindow, MockCard, MockHoursPanel, MockKpi, MockProfitTrend, useMockFormat } from './AppFrame'
import { useI18n } from './i18n'

// Demo figures for the MyEmployee overview (app/[lang]/dashboard/page.tsx).
// Kept internally consistent: contribution = revenue − labour cost.
const HOURS = [580, 596, 604, 590, 618, 612]
const REVENUE = [9200, 9600, 9400, 10100, 10400, 10900]
const LABOR = [6900, 7000, 7100, 7050, 7200, 7300]
const BILLABLE_HOURS = 515

export function HeroDashboard() {
  const { dict } = useI18n()
  const t = dict.heroDashboard
  const f = useMockFormat()

  const revenue = REVENUE[5]
  const labor = LABOR[5]
  const contribution = revenue - labor
  const hours = HOURS[5]

  const delta = (pct: number, suffix = '%') => `${pct >= 0 ? '+' : '−'}${f.num(Math.abs(pct))}${suffix}`

  const kpis = [
    { icon: TrendingUp, label: t.kpis[0], value: f.eur(revenue), delta: delta(4.8), good: true, sub: t.kpiSubs[0] },
    { icon: Wallet, label: t.kpis[1], value: f.eur(labor), delta: delta(1.4), good: false, sub: `${f.hrs(hours)} ${t.kpiSubs[1]}` },
    {
      icon: CircleDollarSign,
      label: t.kpis[2],
      value: f.eur(contribution),
      delta: delta(12.5),
      good: true,
      sub: `${t.kpiSubs[2]} ${f.pct(contribution / revenue)}`,
      tone: 'pos' as const,
    },
    {
      icon: Activity,
      label: t.kpis[3],
      value: f.pct(BILLABLE_HOURS / hours),
      delta: delta(1.6, ` ${t.points}`),
      good: true,
      sub: `${f.hrs(hours - BILLABLE_HOURS)} ${t.kpiSubs[3]}`,
    },
  ]

  return (
    <div className="relative">
      {/* glow */}
      <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[40px] bg-gradient-to-tr from-blue-400/30 via-sky-300/20 to-indigo-400/30 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      >
        <AppWindow address={t.address} active="myemployee">
          {/* header */}
          <div className="mb-2.5 flex items-end justify-between gap-2 px-0.5">
            <div>
              <p className="text-[9px] text-blue-200/70">
                MyEmployee <span className="text-blue-200/40">/</span>{' '}
                <span className="font-medium text-white/90">{t.title}</span>
              </p>
              <p
                className="text-base font-bold leading-tight tracking-tight text-white sm:text-xl"
                style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
              >
                {t.title}
              </p>
              <p className="text-[10px] text-blue-200/80">{t.subtitle}</p>
            </div>
            <div className="hidden overflow-hidden rounded-lg bg-white text-[9px] font-medium text-slate-600 sm:flex">
              {t.ranges.map((r, i) => (
                <span key={r} className={`px-2 py-1 ${i === 1 ? 'bg-blue-50 font-semibold text-blue-700' : ''}`}>
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {kpis.map((k, i) => (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.08 }}
              >
                <MockKpi
                  icon={k.icon}
                  label={k.label}
                  value={k.value}
                  delta={k.delta}
                  deltaGood={k.good}
                  sub={k.sub}
                  tone={k.tone}
                />
              </motion.div>
            ))}
          </div>

          {/* charts */}
          <div className="mt-2 grid gap-2 sm:grid-cols-5">
            <MockCard className="p-2 sm:col-span-2">
              <MockHoursPanel hours={HOURS} labels={t.months} />
              <div className="px-1 pt-2">
                <p className="text-[11px] font-bold text-slate-900">{t.hoursTitle}</p>
                <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                  {[
                    { icon: Clock, label: t.hoursStats[0], value: f.hrs(hours) },
                    { icon: Activity, label: t.hoursStats[1], value: f.hrs(BILLABLE_HOURS) },
                    { icon: Briefcase, label: t.hoursStats[2], value: '5' },
                    { icon: Users, label: t.hoursStats[3], value: '4' },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="min-w-0">
                      <span className="flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        <Icon size={9} strokeWidth={2.25} />
                      </span>
                      <p className="mt-1 truncate text-[8px] text-slate-400">{label}</p>
                      <p className="truncate text-[10px] font-bold tabular-nums text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </MockCard>

            <MockCard className="hidden p-3 sm:col-span-3 sm:block">
              <p className="text-[11px] font-bold text-slate-900">{t.trendTitle}</p>
              <p className="mb-1 text-[9px] text-slate-400">
                <span className="font-semibold text-emerald-600">↑ 12% {t.contribution}</span> {t.trendSub}
              </p>
              <div className="mb-1 flex flex-wrap gap-x-3 text-[9px]">
                <Legend color="#2563EB" label={t.revenue} value={f.eur(REVENUE.reduce((s, v) => s + v, 0))} />
                <Legend color="#1f2a4d" label={t.cost} value={f.eur(LABOR.reduce((s, v) => s + v, 0))} />
              </div>
              <MockProfitTrend revenue={REVENUE} cost={LABOR} labels={t.months} />
            </MockCard>
          </div>
        </AppWindow>
      </motion.div>

      {/* floating cards: a management alert and a utilization target, as raised in the app */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
        transition={{
          opacity: { delay: 1, duration: 0.5 },
          scale: { delay: 1, duration: 0.5 },
          y: { delay: 1.5, duration: 4, repeat: Infinity, ease: 'easeInOut' },
        }}
        className="absolute -bottom-5 -right-3 hidden max-w-[15rem] rounded-xl border border-amber-100 bg-white/95 px-3 py-2 shadow-lg backdrop-blur sm:block"
      >
        <div className="flex items-start gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <Landmark className="h-4 w-4 text-amber-600" />
          </span>
          <div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-900">
              <AlertTriangle className="h-3 w-3 text-amber-500" /> {t.floatAlertTitle}
            </div>
            <div className="text-[10px] leading-snug text-slate-500">{t.floatAlertSub}</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1, y: [0, 8, 0] }}
        transition={{
          opacity: { delay: 1.2, duration: 0.5 },
          scale: { delay: 1.2, duration: 0.5 },
          y: { delay: 1.7, duration: 4.5, repeat: Infinity, ease: 'easeInOut' },
        }}
        className="absolute -bottom-5 -left-4 hidden rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur sm:block"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
            <Gauge className="h-4 w-4 text-emerald-600" />
          </span>
          <div>
            <div className="text-[11px] font-semibold text-slate-900">{t.floatUtilTitle}</div>
            <div className="text-[10px] text-slate-400">{t.floatUtilSub}</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-1 w-3 rounded-full" style={{ background: color }} />
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold tabular-nums text-slate-700">{value}</span>
    </span>
  )
}
