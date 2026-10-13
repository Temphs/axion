'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Briefcase,
  Clock,
  KeyRound,
  Landmark,
  LayoutGrid,
  Settings,
  ShieldCheck,
  Table2,
  Users,
  Users2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from './i18n'

// Scaled-down replicas of the signed-in app (app/[lang]/dashboard): the same
// blue surface, white sidebar, product switcher and card styling, so what the
// landing page shows is what a customer sees after logging in.

/* ─── formatting (matches lib/format, per landing locale) ───── */

export function useMockFormat() {
  const { lang } = useI18n()
  const locale = lang === 'el' ? 'el-GR' : 'en-GB'
  const eur0 = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  const eur2 = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  return {
    eur: (v: number, decimals = false) => (decimals ? eur2 : eur0).format(v),
    hrs: (v: number) => `${num.format(v)} ${lang === 'el' ? 'ώ' : 'h'}`,
    num: (v: number) => num.format(v),
    pct: (fraction: number) => `${num.format(fraction * 100)}%`,
  }
}

/* ─── browser window + dashboard surface ─────────────────────── */

export function AppWindow({
  address,
  active,
  children,
  className,
}: {
  address: string
  active: 'myemployee' | 'vat'
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.4)]',
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <div className="ml-3 flex min-w-0 items-center gap-1.5 truncate rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-slate-400 ring-1 ring-slate-200">
          <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-500" />
          {address}
        </div>
      </div>

      <div className="dashboard-surface flex gap-3 p-2.5 text-left sm:gap-4 sm:p-4">
        <AppSidebar active={active} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

const PRODUCT_ICONS = [Users2, BarChart3, Landmark]
const TOOL_ICONS = [LayoutGrid, Users, Briefcase, Table2, Clock, KeyRound, Settings]

function AppSidebar({ active }: { active: 'myemployee' | 'vat' }) {
  const { dict } = useI18n()
  const t = dict.appMock
  const activeIdx = active === 'vat' ? 1 : 0

  const activeLink = 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_10px_24px_-12px_rgba(37,99,235,0.45)]'
  const tile = (on: boolean) =>
    cn(
      'flex shrink-0 items-center justify-center rounded-md',
      on
        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_3px_8px_-2px_rgba(37,99,235,0.55)]'
        : 'bg-white text-slate-400 shadow-[0_1px_3px_rgba(15,23,42,0.1)]'
    )

  return (
    <aside className="hidden w-40 shrink-0 flex-col rounded-2xl border border-white/40 bg-white/95 p-2.5 md:flex">
      <div className="mb-3 flex items-center gap-2 px-1 pt-0.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-md shadow-blue-900/30">
          A
        </span>
        <div className="leading-tight">
          <div className="text-[13px] font-bold tracking-tight text-slate-900">Axion</div>
          <div className="text-[7px] uppercase tracking-[0.16em] text-slate-400">{t.brandSub}</div>
        </div>
      </div>

      <nav className="space-y-0.5">
        {t.products.map((label, i) => {
          const Icon = PRODUCT_ICONS[i]
          const on = i === activeIdx
          return (
            <div
              key={label}
              className={cn(
                'flex items-center gap-2 rounded-lg p-1 pr-2 text-[11px] font-semibold',
                on ? activeLink : 'text-slate-500'
              )}
            >
              <span className={cn(tile(on), 'h-5 w-5')}>
                <Icon size={11} strokeWidth={2} />
              </span>
              {label}
            </div>
          )
        })}
      </nav>

      {active === 'myemployee' && (
        <nav className="mt-2.5 space-y-0.5 border-t border-slate-100 pt-2.5">
          <span className="mb-1 block px-2 text-[7px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {t.toolsLabel}
          </span>
          {t.tools.map((label, i) => {
            const Icon = TOOL_ICONS[i]
            const on = i === 0
            return (
              <div
                key={label}
                className={cn(
                  'flex items-center gap-2 rounded-lg p-1 pr-2 text-[10.5px] font-medium',
                  on ? activeLink : 'text-slate-500'
                )}
              >
                <span className={cn(tile(on), 'h-[18px] w-[18px]')}>
                  <Icon size={10} strokeWidth={2} />
                </span>
                {label}
              </div>
            )
          })}
        </nav>
      )}
    </aside>
  )
}

/* ─── white card (components/axion/ui Card, tighter) ─────────── */

export function MockCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_18px_40px_-24px_rgba(37,99,235,0.18)]',
        className
      )}
    >
      {children}
    </div>
  )
}

/* ─── KPI card (components/workforce/KpiCard, scaled) ────────── */

export function MockKpi({
  icon: Icon,
  label,
  value,
  delta,
  deltaGood,
  sub,
  tone,
}: {
  icon: typeof Users
  label: string
  value: string
  delta?: string
  deltaGood?: boolean
  sub?: string
  tone?: 'pos' | 'neg'
}) {
  return (
    <MockCard className="p-2.5 sm:p-3">
      <div className="flex items-start justify-between gap-1.5">
        <span className="truncate text-[10px] font-medium text-slate-500 sm:text-[11px]">{label}</span>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_4px_12px_-2px_rgba(37,99,235,0.5)]">
          <Icon size={12} strokeWidth={2} />
        </span>
      </div>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
        <span
          className={cn(
            'text-[15px] font-bold leading-none tabular-nums tracking-tight sm:text-lg',
            tone === 'pos' ? 'text-emerald-600' : tone === 'neg' ? 'text-red-500' : 'text-slate-900'
          )}
          style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
        >
          {value}
        </span>
        {delta && (
          <span className={cn('text-[10px] font-bold tabular-nums', deltaGood ? 'text-emerald-600' : 'text-red-500')}>
            {delta}
          </span>
        )}
      </p>
      {sub && <p className="mt-1 truncate text-[9.5px] text-slate-400">{sub}</p>}
    </MockCard>
  )
}

/* ─── hours bars on the dark panel (HoursOverviewCard) ───────── */

export function MockHoursPanel({ hours, labels }: { hours: number[]; labels: string[] }) {
  const { num } = useMockFormat()
  const max = Math.ceil(Math.max(...hours) / 250) * 250
  return (
    <div className="rounded-lg bg-gradient-to-br from-[#1f2a4d] via-[#1b2749] to-[#141d38] p-3 shadow-[0_12px_28px_-14px_rgba(15,23,42,0.7)]">
      <div className="relative h-24">
        {[1, 0.5, 0].map((t) => (
          <div key={t} className="absolute inset-x-0 flex items-center gap-2" style={{ top: `${(1 - t) * 100}%` }}>
            <span className="w-6 shrink-0 text-right text-[8px] tabular-nums text-white/45">{num(max * t)}</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>
        ))}
        <div className="absolute inset-0 flex items-stretch gap-1 pl-8">
          {hours.map((h, i) => (
            <div key={i} className="flex flex-1 items-end justify-center">
              <motion.span
                className="block w-full max-w-[7px] rounded-full bg-white/90"
                initial={{ height: 0 }}
                animate={{ height: `${(h / max) * 100}%` }}
                transition={{ duration: 0.55, delay: 0.4 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex gap-1 pl-8">
        {labels.map((l) => (
          <span key={l} className="flex-1 truncate text-center text-[8px] text-white/45">
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ─── revenue vs labour cost lines (ProfitTrendChart) ────────── */

type Pt = [number, number]

function smoothPath(points: Pt[]): string {
  const d = [`M ${points[0][0]},${points[0][1]}`]
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1]
    d.push(
      `C ${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6}` +
        ` ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6}` +
        ` ${p2[0]},${p2[1]}`
    )
  }
  return d.join(' ')
}

export function MockProfitTrend({ revenue, cost, labels }: { revenue: number[]; cost: number[]; labels: string[] }) {
  const { eur } = useMockFormat()
  const W = 400
  const H = 130
  const L = 44
  const R = 14
  const T = 8
  const B = 20
  const max = Math.ceil(Math.max(...revenue, ...cost) / 2500) * 2500
  const xOf = (i: number) => L + (i / (revenue.length - 1)) * (W - L - R)
  const yOf = (v: number) => T + (H - T - B) - (v / max) * (H - T - B)
  const revPts: Pt[] = revenue.map((v, i) => [xOf(i), yOf(v)])
  const costPts: Pt[] = cost.map((v, i) => [xOf(i), yOf(v)])
  const revLine = smoothPath(revPts)
  const base = H - B

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" fill="none" aria-hidden>
      <defs>
        <linearGradient id="mock-trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[1, 0.5, 0].map((t) => {
        const y = T + (H - T - B) * (1 - t)
        return (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y} y2={y} stroke="#cbd5e1" strokeDasharray="2 4" strokeLinecap="round" />
            <text x={L - 6} y={y + 3} textAnchor="end" className="fill-slate-400 text-[9px] tabular-nums">
              {eur(max * t)}
            </text>
          </g>
        )
      })}
      <motion.path
        d={`${revLine} L ${revPts[revPts.length - 1][0]},${base} L ${revPts[0][0]},${base} Z`}
        fill="url(#mock-trend-fill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.6 }}
      />
      <motion.path
        d={smoothPath(costPts)}
        stroke="#1f2a4d"
        strokeWidth="2.25"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.4, ease: 'easeInOut' }}
      />
      <motion.path
        d={revLine}
        stroke="#2563EB"
        strokeWidth="2.25"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.4, ease: 'easeInOut' }}
      />
      {labels.map((l, i) => (
        <text key={l} x={xOf(i)} y={H - 5} textAnchor="middle" className="fill-slate-400 text-[9px]">
          {l}
        </text>
      ))}
    </svg>
  )
}
