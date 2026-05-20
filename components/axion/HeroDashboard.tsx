'use client'

import { motion } from 'framer-motion'
import {
  LayoutGrid,
  TrendingUp,
  Wallet,
  Users,
  PieChart,
  Settings,
  ArrowUpRight,
  ShieldCheck,
  Bell,
} from 'lucide-react'
import { ForecastChart, ProgressBar } from './charts'
import { LogoMark } from './Logo'
import { useI18n } from './i18n'

const employees = [
  { name: 'M. Papad…', util: 92, color: '#2563EB' },
  { name: 'A. Nikol…', util: 78, color: '#3b82f6' },
  { name: 'K. Georg…', util: 64, color: '#60a5fa' },
]

const railIcons = [LayoutGrid, TrendingUp, Wallet, Users, PieChart, Settings]

export function HeroDashboard() {
  const { dict } = useI18n()
  const t = dict.heroDashboard

  const kpiMeta = [
    { value: '€18,420', delta: '+4.2%', icon: Wallet, tone: 'text-blue-600' },
    { value: '€92.4k', delta: '+11.8%', icon: TrendingUp, tone: 'text-emerald-600' },
    { value: t.runway, delta: t.healthy, icon: ShieldCheck, tone: 'text-blue-600' },
  ]
  const kpis = kpiMeta.map((k, i) => ({ ...k, label: t.kpiLabels[i] }))

  return (
    <div className="relative">
      {/* glow */}
      <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[40px] bg-gradient-to-tr from-blue-400/30 via-sky-300/20 to-indigo-400/30 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.4)]"
      >
        {/* window bar */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <div className="ml-3 flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-slate-400 ring-1 ring-slate-200">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            {t.address}
          </div>
          <Bell className="ml-auto h-3.5 w-3.5 text-slate-300" />
        </div>

        <div className="flex">
          {/* rail */}
          <div className="hidden flex-col items-center gap-1 border-r border-slate-100 bg-slate-50/50 py-4 sm:flex">
            <div className="mb-3">
              <LogoMark className="h-7 w-7" />
            </div>
            {railIcons.map((Icon, i) => (
              <div
                key={i}
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  i === 0 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
            ))}
          </div>

          {/* content */}
          <div className="flex-1 space-y-3 p-3 sm:p-4">
            {/* kpis */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {kpis.map((k, i) => (
                <motion.div
                  key={k.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                  className="rounded-xl border border-slate-100 bg-white p-2.5 sm:p-3"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <k.icon className={`h-4 w-4 ${k.tone}`} />
                    <span className="hidden text-[10px] font-semibold text-emerald-600 sm:inline">
                      {k.delta}
                    </span>
                  </div>
                  <div className="text-sm font-bold tracking-tight text-slate-900 sm:text-lg">
                    {k.value}
                  </div>
                  <div className="truncate text-[10px] text-slate-400">{k.label}</div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* forecast */}
              <div className="col-span-3 rounded-xl border border-slate-100 bg-white p-3 lg:col-span-2">
                <div className="mb-1 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{t.forecastTitle}</div>
                    <div className="text-[10px] text-slate-400">{t.forecastSub}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                    <ArrowUpRight className="h-3 w-3" /> 12.4%
                  </span>
                </div>
                <ForecastChart data={[22, 28, 25, 34, 31, 42, 39, 48, 52]} splitAt={5} />
                <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> {t.actual}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-300" /> {t.predicted}
                  </span>
                </div>
              </div>

              {/* employee profitability */}
              <div className="col-span-3 rounded-xl border border-slate-100 bg-white p-3 lg:col-span-1">
                <div className="mb-2 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-slate-900">{t.profitabilityShort}</span>
                </div>
                <div className="space-y-2.5">
                  {employees.map((e, i) => (
                    <div key={e.name}>
                      <div className="mb-1 flex items-center justify-between text-[10px]">
                        <span className="font-medium text-slate-600">{e.name}</span>
                        <span className="font-semibold text-slate-900">{e.util}%</span>
                      </div>
                      <ProgressBar value={e.util} color={e.color} delay={0.7 + i * 0.15} />
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg bg-blue-50/70 p-2">
                  <div className="text-[10px] text-slate-500">{t.avgMargin}</div>
                  <div className="text-sm font-bold text-blue-700">€142 / hr</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* floating cards */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
        transition={{
          opacity: { delay: 1, duration: 0.5 },
          scale: { delay: 1, duration: 0.5 },
          y: { delay: 1.5, duration: 4, repeat: Infinity, ease: 'easeInOut' },
        }}
        className="absolute -right-3 top-20 hidden rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur sm:block"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </span>
          <div>
            <div className="text-[11px] font-semibold text-slate-900">{t.floatLiquidityTitle}</div>
            <div className="text-[10px] text-slate-400">{t.floatLiquiditySub}</div>
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
        className="absolute -left-4 bottom-16 hidden rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur sm:block"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </span>
          <div>
            <div className="text-[11px] font-semibold text-slate-900">{t.floatForecastTitle}</div>
            <div className="text-[10px] text-slate-400">{t.floatForecastSub}</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
