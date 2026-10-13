'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  Database,
  RefreshCw,
  ListChecks,
  TrendingUp,
  PieChart as PieIcon,
  Users,
  Clock,
  Target,
  AlertTriangle,
  ArrowUpRight,
  Star,
} from 'lucide-react'
import { BarChart, Donut } from './charts'
import { useMockFormat } from './AppFrame'
import { Eyebrow } from './ui'
import { Reveal } from './motion'
import { useI18n } from './i18n'

/* ─── shared row layout ──────────────────────────────────────── */

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-slate-600">
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
      {children}
    </li>
  )
}

function FeatureRow({
  eyebrow,
  title,
  desc,
  bullets,
  chips,
  mockup,
  reverse,
  badge,
}: {
  badge?: string
  eyebrow: string
  title: string
  desc: string
  bullets: string[]
  chips?: { icon: typeof Database; label: string }[]
  mockup: ReactNode
  reverse?: boolean
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <Reveal className={reverse ? 'lg:order-2' : ''}>
        <div className="flex flex-wrap items-center gap-2">
          <Eyebrow>{eyebrow}</Eyebrow>
          {badge && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {badge}
            </span>
          )}
        </div>
        <h3
          className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
        >
          {title}
        </h3>
        <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600">{desc}</p>
        <ul className="mt-6 space-y-3">
          {bullets.map((b) => (
            <Bullet key={b}>{b}</Bullet>
          ))}
        </ul>
        {chips && (
          <div className="mt-6 flex flex-wrap gap-2">
            {chips.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                <c.icon className="h-3.5 w-3.5 text-blue-600" />
                {c.label}
              </span>
            ))}
          </div>
        )}
      </Reveal>

      <Reveal delay={0.12} className={reverse ? 'lg:order-1' : ''}>
        <div className="relative">
          <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-tr from-blue-300/20 to-indigo-300/20 blur-2xl" />
          {mockup}
        </div>
      </Reveal>
    </div>
  )
}

function MockShell({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.3)] sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {sub && <div className="text-xs text-slate-400">{sub}</div>}
        </div>
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
      </div>
      {children}
    </div>
  )
}

/* ─── mockups ────────────────────────────────────────────────── */

function VatMockup() {
  const { dict } = useI18n()
  const t = dict.features.vatMockup
  const f = useMockFormat()
  const periods = [
    { label: t.periods[0], net: 3400 },
    { label: t.periods[1], net: 3900 },
    { label: t.periods[2], net: 4860, forecast: true },
  ]
  return (
    <MockShell title={t.title} sub={t.sub}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{f.eur(4860, true)}</span>
        <span className="text-xs font-medium text-slate-500">{t.payable}</span>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          {t.confidence}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {t.range}: {f.eur(4310)} – {f.eur(5420)}
      </p>
      <BarChart groups={[[7400, 4300], [8100, 4700], [7800, 4900], [8600, 4800], [8900, 5000], [9120, 5180]]} className="mt-2" />
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <span className="text-xs font-medium text-amber-700">{t.alert}</span>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="text-xs font-semibold text-slate-500">{t.netByPeriod}</div>
        {periods.map((p) => (
          <div key={p.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-600">
              {p.label}
              {p.forecast && <span className="ml-1.5 text-[10px] font-semibold text-blue-600">{t.forecastTag}</span>}
            </span>
            <span className="flex items-center gap-1 font-semibold tabular-nums text-slate-900">
              {f.eur(p.net, true)}
              <ArrowUpRight className="h-3.5 w-3.5 text-amber-500" />
            </span>
          </div>
        ))}
      </div>
    </MockShell>
  )
}

function PnlMockup() {
  const { dict } = useI18n()
  const t = dict.features.pnlMockup
  const cats = [
    { label: t.cats[0], value: 45, color: '#2563EB' },
    { label: t.cats[1], value: 25, color: '#3b82f6' },
    { label: t.cats[2], value: 18, color: '#60a5fa' },
    { label: t.cats[3], value: 12, color: '#bfdbfe' },
  ]
  return (
    <MockShell title={t.title} sub={t.sub}>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          { l: t.stats[0], v: '€248k', t: 'text-slate-900' },
          { l: t.stats[1], v: '€156k', t: 'text-slate-900' },
          { l: t.stats[2], v: '37%', t: 'text-emerald-600' },
        ].map((k) => (
          <div key={k.l} className="rounded-lg bg-slate-50 p-2.5">
            <div className={`text-base font-bold tracking-tight ${k.t}`}>{k.v}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400">{k.l}</div>
          </div>
        ))}
      </div>
      <BarChart
        groups={[
          [34, 28],
          [38, 30],
          [31, 33],
          [44, 36],
          [40, 35],
          [52, 41],
        ]}
      />
      <div className="mt-4 grid grid-cols-2 items-center gap-3 border-t border-slate-100 pt-3">
        <Donut
          segments={cats}
          centerLabel="€156k"
          centerSub={t.donutSub}
          className="mx-auto w-24"
        />
        <div className="space-y-1.5">
          {cats.map((c) => (
            <div key={c.label} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                {c.label}
              </span>
              <span className="font-semibold text-slate-900">{c.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </MockShell>
  )
}

function EmployeeMockup() {
  const { dict } = useI18n()
  const t = dict.features.employeeMockup
  const f = useMockFormat()
  // hours × (revenue/h − cost/h) = contribution, as the app computes it
  const rows = [
    { in: 'MP', name: 'Maria P.', hours: 164, cost: 15, rev: 24, color: '#2563EB' },
    { in: 'AN', name: 'Andreas N.', hours: 152, cost: 14, rev: 21, color: '#4f46e5' },
    { in: 'KG', name: 'Katerina G.', hours: 148, cost: 11, rev: 16, color: '#0891b2', short: 2 },
    { in: 'DV', name: 'Dimitris V.', hours: 140, cost: 12, rev: 13, color: '#7c3aed' },
  ]
  const clients = [
    { name: 'Aegean Foods', value: 40.6, color: '#1d4ed8' },
    { name: 'Kolymbari O.E.', value: 28.1, color: '#2563EB' },
    { name: 'Papaloukas IKE', value: 21.9, color: '#3b82f6' },
    { name: 'Ilios Studio', value: 9.4, color: '#60a5fa' },
  ]
  const totalHours = rows.reduce((s, r) => s + r.hours, 0)
  const totalContribution = rows.reduce((s, r) => s + r.hours * (r.rev - r.cost), 0)
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <MockShell title={t.title} sub={t.sub}>
          <div className="space-y-3.5">
            {rows.map((r, i) => {
              const contribution = r.hours * (r.rev - r.cost)
              return (
                <motion.div
                  key={r.name}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: r.color }}
                    >
                      {r.in}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">{r.name}</span>
                      <span className="block text-[11px] leading-snug text-slate-400">
                        {f.hrs(r.hours)} · {t.cost} {f.eur(r.cost)}/{t.perHour} · {t.revenue} {f.eur(r.rev)}/{t.perHour}
                      </span>
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold tabular-nums text-emerald-600">{f.eur(contribution)}</span>
                      <span className="block text-[10px] text-slate-400">{t.contribution}</span>
                    </span>
                  </div>
                  {r.short && (
                    <span className="ml-12 mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      <AlertTriangle className="h-2.5 w-2.5" /> {r.short} {t.belowTarget}
                    </span>
                  )}
                </motion.div>
              )
            })}
          </div>
        </MockShell>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <MockShell title={t.revenueByClient}>
          <Donut
            segments={clients.map((c) => ({ value: c.value, color: c.color }))}
            centerLabel={f.eur(9200)}
            centerSub={t.month}
            className="mx-auto w-32"
          />
          <ul className="mt-3 space-y-1">
            {clients.map((c) => (
              <li key={c.name} className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="min-w-0 flex-1 truncate text-slate-600">{c.name}</span>
                <span className="tabular-nums text-slate-400">{f.pct(c.value / 100)}</span>
              </li>
            ))}
          </ul>
        </MockShell>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <Target className="mb-1 h-4 w-4 text-blue-600" />
            <div className="text-lg font-bold text-slate-900">{f.eur(totalContribution / totalHours, true)}</div>
            <div className="text-[10px] text-slate-400">{t.avgMarginHr}</div>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <Clock className="mb-1 h-4 w-4 text-blue-600" />
            <div className="text-lg font-bold text-slate-900">2</div>
            <div className="text-[10px] text-slate-400">{t.daysBelowTarget}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── section ────────────────────────────────────────────────── */

export function Features() {
  const { dict } = useI18n()
  const t = dict.features

  return (
    <section id="features" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h2
            className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
          >
            {t.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">{t.subtitle}</p>
        </Reveal>

        <div className="mt-14 space-y-16 sm:mt-20 sm:space-y-32">
          <FeatureRow
            eyebrow={t.vat.eyebrow}
            title={t.vat.title}
            desc={t.vat.desc}
            bullets={t.vat.bullets}
            chips={[
              { icon: RefreshCw, label: t.vat.chips[0] },
              { icon: ListChecks, label: t.vat.chips[1] },
            ]}
            mockup={<VatMockup />}
          />

          <FeatureRow
            reverse
            badge={t.pnl.soon}
            eyebrow={t.pnl.eyebrow}
            title={t.pnl.title}
            desc={t.pnl.desc}
            bullets={t.pnl.bullets}
            chips={[
              { icon: TrendingUp, label: t.pnl.chips[0] },
              { icon: PieIcon, label: t.pnl.chips[1] },
            ]}
            mockup={<PnlMockup />}
          />
        </div>

        {/* Flagship: MyEmployee */}
        <Reveal>
          <div className="relative mt-16 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/60 p-6 sm:mt-32 sm:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <Star className="h-3 w-3 fill-white" /> {t.employee.flagship}
                </span>
                <div className="mt-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <Eyebrow>{t.employee.eyebrow}</Eyebrow>
                </div>
                <h3
                  className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl"
                  style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
                >
                  {t.employee.title}
                </h3>
                <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600">
                  {t.employee.desc}
                </p>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {t.employee.bullets.map((b) => (
                    <Bullet key={b}>{b}</Bullet>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <EmployeeMockup />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
