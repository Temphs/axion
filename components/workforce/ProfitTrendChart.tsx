'use client'

import { motion } from 'framer-motion'
import { useId, useState } from 'react'
import { eur, hrs } from '@/lib/format'
import type { TrendPoint } from '@/lib/profitability'

// Monthly profitability: revenue and labour cost as two smooth lines over a
// common zero baseline, so the gap between them reads as the contribution.
// Per-month figures stay available on hover.

const W = 900
const H = 240
const PAD_L = 66
const PAD_R = 36 // room for the last month label, which is centred on the final point
const PAD_T = 14
const PAD_B = 30

// Rounds an axis maximum up to a readable tick value, so gridline labels come
// out as round money amounts rather than the raw data maximum.
function niceMax(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  for (const step of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) {
    if (value <= step * magnitude) return step * magnitude
  }
  return 10 * magnitude
}

type Pt = [number, number]

// Catmull-Rom control points, matching the curve used by the marketing charts.
function smoothPath(points: Pt[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0][0]},${points[0][1]}`
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

export function ProfitTrendChart({ data }: { data: TrendPoint[] }) {
  const id = useId().replace(/:/g, '')
  // Index of the month under the pointer, so the exact figures can be read off
  // the chart instead of guessed from the curve.
  const [active, setActive] = useState<number | null>(null)
  const hasData = data.some((d) => d.revenue !== 0 || d.laborCost !== 0)
  if (!hasData) {
    return <p className="py-10 text-center text-sm text-slate-400">Δεν υπάρχουν δεδομένα για την περίοδο.</p>
  }

  const max = niceMax(Math.max(...data.map((d) => Math.max(d.revenue, d.laborCost)), 0))
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  // A single point would divide by zero; pin it to the middle of the plot.
  const xOf = (i: number) => (data.length === 1 ? PAD_L + innerW / 2 : PAD_L + (i / (data.length - 1)) * innerW)
  const yOf = (v: number) => PAD_T + innerH - (Math.max(0, v) / max) * innerH

  const revenuePts: Pt[] = data.map((d, i) => [xOf(i), yOf(d.revenue)])
  const costPts: Pt[] = data.map((d, i) => [xOf(i), yOf(d.laborCost)])
  const revenueLine = smoothPath(revenuePts)
  const baseline = PAD_T + innerH

  const shown = active !== null ? data[active] : null

  return (
    <div onMouseLeave={() => setActive(null)}>
      {/* Exact figures for the hovered month, or the period total at rest */}
      <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 px-1 text-xs">
        <span className="font-display text-sm font-bold text-slate-900">
          {shown ? shown.label : `${data[0].label} → ${data[data.length - 1].label}`}
        </span>
        <Figure label="Έσοδα" value={eur(shown ? shown.revenue : data.reduce((s, d) => s + d.revenue, 0))} dot="#2563EB" />
        <Figure label="Κόστος" value={eur(shown ? shown.laborCost : data.reduce((s, d) => s + d.laborCost, 0))} dot="#1f2a4d" />
        <Figure
          label="Συνεισφορά"
          value={eur(shown ? shown.contribution : data.reduce((s, d) => s + d.contribution, 0))}
          tone={(shown ? shown.contribution : data.reduce((s, d) => s + d.contribution, 0)) >= 0 ? 'pos' : 'neg'}
        />
        {shown && <Figure label="Ώρες" value={hrs(shown.hours)} />}
        {!shown && <span className="text-slate-400">— περάστε τον δείκτη πάνω από έναν μήνα</span>}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" fill="none" role="img" aria-label="Έσοδα και κόστος εργασίας ανά μήνα">
        <defs>
          <linearGradient id={`trend-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Dotted gridlines with money labels */}
        {[1, 0.75, 0.5, 0.25, 0].map((t) => {
          const y = PAD_T + innerH * (1 - t)
          return (
            <g key={t}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y}
                y2={y}
                stroke="#cbd5e1"
                strokeWidth="1"
                strokeDasharray="2 4"
                strokeLinecap="round"
              />
              <text x={PAD_L - 8} y={y + 3.5} textAnchor="end" className="fill-slate-400 text-[10px] tabular-nums">
                {eur(max * t)}
              </text>
            </g>
          )
        })}

        <motion.path
          d={`${revenueLine} L ${revenuePts[revenuePts.length - 1][0]},${baseline} L ${revenuePts[0][0]},${baseline} Z`}
          fill={`url(#trend-${id})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
        />
        <motion.path
          d={smoothPath(costPts)}
          stroke="#1f2a4d"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />
        <motion.path
          d={revenueLine}
          stroke="#2563EB"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />

        {/* Month labels */}
        {data.map((d, i) => (
          <text
            key={d.month}
            x={xOf(i)}
            y={H - 8}
            textAnchor="middle"
            className={active === i ? 'fill-slate-700 text-[10px] font-semibold' : 'fill-slate-400 text-[10px]'}
          >
            {d.label}
          </text>
        ))}

        {/* Hover readout: a guide line, the two points, and the figures */}
        {active !== null && (
          <g pointerEvents="none">
            <line
              x1={xOf(active)}
              x2={xOf(active)}
              y1={PAD_T}
              y2={baseline}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={xOf(active)} cy={yOf(data[active].revenue)} r="4.5" fill="#2563EB" stroke="#fff" strokeWidth="2" />
            <circle cx={xOf(active)} cy={yOf(data[active].laborCost)} r="4.5" fill="#1f2a4d" stroke="#fff" strokeWidth="2" />
          </g>
        )}

        {/* One band per month drives the hover */}
        {data.map((d, i) => (
          <rect
            key={`hit-${d.month}`}
            x={xOf(i) - innerW / (data.length * 2 || 1)}
            y={PAD_T}
            width={innerW / (data.length || 1)}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            tabIndex={0}
            role="button"
            aria-label={`${d.label}: έσοδα ${eur(d.revenue)}, κόστος ${eur(d.laborCost)}, συνεισφορά ${eur(d.contribution)}`}
            className="cursor-crosshair outline-none"
          />
        ))}
      </svg>

      <p className="mt-1 px-1 text-[11px] text-slate-400">Η απόσταση των γραμμών είναι η συνεισφορά</p>
    </div>
  )
}

function Figure({
  label,
  value,
  dot,
  tone,
}: {
  label: string
  value: string
  dot?: string
  tone?: 'pos' | 'neg'
}) {
  return (
    <span className="flex items-center gap-1.5">
      {dot && <span className="h-1.5 w-4 shrink-0 rounded-full" style={{ background: dot }} />}
      <span className="text-slate-400">{label}</span>
      <span
        className={`font-semibold tabular-nums ${
          tone === 'pos' ? 'text-emerald-600' : tone === 'neg' ? 'text-red-500' : 'text-slate-700'
        }`}
      >
        {value}
      </span>
    </span>
  )
}
