'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  Database,
  Zap,
  TrendingUp,
  PieChart as PieIcon,
  Users,
  Clock,
  Target,
  AlertTriangle,
  ArrowUpRight,
  Star,
} from 'lucide-react'
import { ForecastChart, BarChart, Donut, ProgressBar } from './charts'
import { Eyebrow } from './ui'
import { Reveal } from './motion'

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
}: {
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
        <Eyebrow>{eyebrow}</Eyebrow>
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
  const liabilities = [
    { m: 'April', v: '€18,420', up: true },
    { m: 'May', v: '€21,050', up: true },
    { m: 'June', v: '€19,300', up: false },
  ]
  return (
    <MockShell title="VAT forecast" sub="Next 6 months · powered by MyData">
      <ForecastChart data={[16, 19, 17, 24, 22, 28, 26, 31, 34]} splitAt={5} />
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
        <span className="text-xs font-medium text-amber-700">
          Liquidity dips below threshold in <span className="font-bold">23 days</span>
        </span>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="text-xs font-semibold text-slate-500">Upcoming liabilities</div>
        {liabilities.map((l) => (
          <div
            key={l.m}
            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
          >
            <span className="text-slate-600">{l.m}</span>
            <span className="flex items-center gap-1 font-semibold text-slate-900">
              {l.v}
              <ArrowUpRight
                className={`h-3.5 w-3.5 ${l.up ? 'text-emerald-500' : 'rotate-90 text-slate-400'}`}
              />
            </span>
          </div>
        ))}
      </div>
    </MockShell>
  )
}

function PnlMockup() {
  const cats = [
    { label: 'Payroll', value: 45, color: '#2563EB' },
    { label: 'Suppliers', value: 25, color: '#3b82f6' },
    { label: 'Operations', value: 18, color: '#60a5fa' },
    { label: 'Tax', value: 12, color: '#bfdbfe' },
  ]
  return (
    <MockShell title="Profit & Loss" sub="This year vs. last year">
      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          { l: 'Revenue', v: '€248k', t: 'text-slate-900' },
          { l: 'Expenses', v: '€156k', t: 'text-slate-900' },
          { l: 'Margin', v: '37%', t: 'text-emerald-600' },
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
          centerSub="expenses"
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
  const rows = [
    { in: 'MP', name: 'Maria P.', role: 'Senior Acct', hours: '164h', rate: '€38', margin: 92, color: '#2563EB' },
    { in: 'AN', name: 'Andreas N.', role: 'Tax Advisor', hours: '152h', rate: '€42', margin: 78, color: '#3b82f6' },
    { in: 'KG', name: 'Katerina G.', role: 'Bookkeeper', hours: '148h', rate: '€29', margin: 64, color: '#60a5fa' },
    { in: 'DV', name: 'Dimitris V.', role: 'Analyst', hours: '140h', rate: '€34', margin: 71, color: '#93c5fd' },
  ]
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <MockShell title="Employee profitability" sub="Q2 · all projects">
          <div className="space-y-3">
            {rows.map((r, i) => (
              <motion.div
                key={r.name}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex items-center gap-3"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: r.color }}
                >
                  {r.in}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-semibold text-slate-900">{r.name}</span>
                    <span className="text-xs font-semibold text-slate-900">{r.margin}%</span>
                  </div>
                  <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-400">
                    <span>{r.role}</span>·<span>{r.hours}</span>·<span>{r.rate}/hr</span>
                  </div>
                  <ProgressBar value={r.margin} color={r.color} delay={i * 0.1} />
                </div>
              </motion.div>
            ))}
          </div>
        </MockShell>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <MockShell title="Revenue by client">
          <Donut
            segments={[
              { value: 42, color: '#2563EB' },
              { value: 28, color: '#3b82f6' },
              { value: 18, color: '#60a5fa' },
              { value: 12, color: '#bfdbfe' },
            ]}
            centerLabel="€312k"
            centerSub="Q2"
            className="mx-auto w-32"
          />
        </MockShell>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <Target className="mb-1 h-4 w-4 text-blue-600" />
            <div className="text-lg font-bold text-slate-900">€142</div>
            <div className="text-[10px] text-slate-400">avg margin / hr</div>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <Clock className="mb-1 h-4 w-4 text-blue-600" />
            <div className="text-lg font-bold text-slate-900">86%</div>
            <div className="text-[10px] text-slate-400">billable rate</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── section ────────────────────────────────────────────────── */

export function Features() {
  return (
    <section id="features" className="px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Features</Eyebrow>
          <h2
            className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
          >
            One platform for your entire financial picture
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            From VAT forecasting to employee-level profitability — Axion turns raw invoice
            data into decisions you can act on.
          </p>
        </Reveal>

        <div className="mt-20 space-y-24 sm:space-y-32">
          <FeatureRow
            eyebrow="MyVAT Prediction"
            title="Predict VAT obligations before they're due"
            desc="Predict future VAT obligations in real time using MyData invoice activity from AADE."
            bullets={[
              'VAT forecasting dashboard',
              'Liquidity alerts before deadlines',
              'Upcoming liabilities at a glance',
            ]}
            chips={[
              { icon: Database, label: 'SQL pipeline · MyData invoices' },
              { icon: Zap, label: 'Real-time prediction engine' },
            ]}
            mockup={<VatMockup />}
          />

          <FeatureRow
            reverse
            eyebrow="P&L Analysis"
            title="See exactly where money is made and spent"
            desc="Automatically categorize invoices and monitor earnings and expenses across all businesses."
            bullets={[
              'Monthly vs. yearly comparison',
              'Revenue & expense analytics',
              'Automatic expense categorization',
              'Live profitability metrics',
            ]}
            chips={[
              { icon: TrendingUp, label: 'Revenue analytics' },
              { icon: PieIcon, label: 'Auto-categorization' },
            ]}
            mockup={<PnlMockup />}
          />
        </div>

        {/* Flagship: MyEmployee */}
        <Reveal>
          <div className="relative mt-24 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/60 p-6 sm:mt-32 sm:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <Star className="h-3 w-3 fill-white" /> Flagship feature
                </span>
                <div className="mt-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <Eyebrow>MyEmployee</Eyebrow>
                </div>
                <h3
                  className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl"
                  style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
                >
                  Track profitability down to the employee hour
                </h3>
                <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600">
                  Track employee time, project costs, and client profitability with complete
                  visibility — so you always know which work actually pays.
                </p>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    'Time tracking per project',
                    'Cost per employee hour',
                    'Client / project allocation',
                    'Profitability reports',
                    'Performance metrics',
                    'Billable utilization',
                  ].map((b) => (
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
