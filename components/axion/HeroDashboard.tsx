'use client'

import { motion } from 'framer-motion'
import {
  Bell,
  Briefcase,
  ClipboardCheck,
  Clock,
  LayoutGrid,
  Settings,
  ShieldCheck,
  TriangleAlert,
  Users,
  Wallet,
} from 'lucide-react'
import { LogoMark } from './Logo'
import { useI18n } from './i18n'

// The first thing a firm owner sees. Every figure here is one the product
// actually computes: hours, labor cost, fee, contribution, margin. No VAT, no
// cash runway, no unlabelled employee percentage.
const kpiIcons = [Clock, Wallet, Briefcase, ClipboardCheck]
const railIcons = [LayoutGrid, Users, Briefcase, Clock, Settings]

export function HeroDashboard() {
  const { dict } = useI18n()
  const t = dict.heroDashboard

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
                  i === 0 ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
            ))}
          </div>

          {/* content */}
          <div className="min-w-0 flex-1 space-y-3 p-3 sm:p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold text-slate-900">{t.period}</span>
              <span className="hidden text-[10px] text-slate-400 sm:inline">{t.vsPrevious}</span>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4">
              {t.kpis.map((k, i) => {
                const Icon = kpiIcons[i]
                return (
                  <motion.div
                    key={k.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 + i * 0.08 }}
                    className="rounded-xl border border-slate-100 bg-white p-2.5"
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <Icon className="h-3.5 w-3.5 text-blue-600" />
                      {k.delta && (
                        <span className="text-[9px] font-semibold text-slate-400">{k.delta}</span>
                      )}
                    </div>
                    <div className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">
                      {k.value}
                    </div>
                    <div className="truncate text-[10px] text-slate-400">{k.label}</div>
                  </motion.div>
                )
              })}
            </div>

            {/* client profitability */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.85 }}
              className="overflow-hidden rounded-xl border border-slate-100"
            >
              <div className="flex items-baseline justify-between border-b border-slate-100 bg-slate-50/60 px-3 py-2">
                <span className="text-xs font-semibold text-slate-900">{t.tableTitle}</span>
                <span className="hidden text-[10px] text-slate-400 sm:inline">{t.tableSub}</span>
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] uppercase tracking-wide text-slate-400">
                    {t.columns.map((c, i) => (
                      <th
                        key={c}
                        className={`px-2 py-1.5 font-medium sm:px-3 ${i > 0 ? 'text-right' : ''} ${
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
                      <td className="px-2 py-2 sm:px-3">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[11px] font-medium text-slate-800">{r.name}</span>
                          {r.watch && <TriangleAlert className="h-3 w-3 shrink-0 text-amber-500" />}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right text-[11px] tabular-nums text-slate-600 sm:px-3">
                        {r.fee}
                      </td>
                      <td className="hidden px-3 py-2 text-right text-[11px] tabular-nums text-slate-500 sm:table-cell">
                        {r.hours}
                      </td>
                      <td className="hidden px-3 py-2 text-right text-[11px] tabular-nums text-slate-500 sm:table-cell">
                        {r.cost}
                      </td>
                      <td className="px-2 py-2 text-right text-[11px] font-semibold tabular-nums text-slate-900 sm:px-3">
                        {r.contribution}
                      </td>
                      <td className="px-2 py-2 text-right sm:px-3">
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
            </motion.div>
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
        className="absolute -right-3 top-24 hidden rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur lg:block"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
            <Wallet className="h-4 w-4 text-emerald-600" />
          </span>
          <div>
            <div className="text-[11px] font-semibold text-slate-900">{t.floatContributionTitle}</div>
            <div className="text-[10px] text-slate-400">{t.floatContributionSub}</div>
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
        className="absolute -left-4 bottom-12 hidden rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur lg:block"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
            <TriangleAlert className="h-4 w-4 text-amber-600" />
          </span>
          <div>
            <div className="text-[11px] font-semibold text-slate-900">{t.floatMarginTitle}</div>
            <div className="text-[10px] text-slate-400">{t.floatMarginSub}</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
