'use client'

import { motion } from 'framer-motion'
import { useId } from 'react'
import { cn } from '@/lib/utils'

/* ─── helpers ────────────────────────────────────────────────── */

type Pt = [number, number]

function scale(data: number[], w: number, h: number, pad: number): Pt[] {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const span = max - min || 1
  const innerW = w - pad * 2
  const innerH = h - pad * 2
  return data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * innerW
    const y = pad + innerH - ((v - min) / span) * innerH
    return [x, y]
  })
}

function smoothPath(points: Pt[]): string {
  if (points.length < 2) return ''
  const d = [`M ${points[0][0]},${points[0][1]}`]
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1]
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6
    d.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`)
  }
  return d.join(' ')
}

const viewport = { once: true, margin: '-40px' }

/* ─── Area chart (smooth, gradient fill + animated draw) ─────── */

export function AreaChart({
  data,
  className,
  stroke = '#2563EB',
  fill = '#2563EB',
  showDots = true,
}: {
  data: number[]
  className?: string
  stroke?: string
  fill?: string
  showDots?: boolean
}) {
  const id = useId().replace(/:/g, '')
  const W = 320
  const H = 150
  const pad = 14
  const pts = scale(data, W, H, pad)
  const line = smoothPath(pts)
  const area = `${line} L ${pts[pts.length - 1][0]},${H - pad} L ${pts[0][0]},${H - pad} Z`
  const last = pts[pts.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('h-auto w-full', className)} fill="none">
      <defs>
        <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.22" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={pad}
          x2={W - pad}
          y1={pad + (H - pad * 2) * g}
          y2={pad + (H - pad * 2) * g}
          stroke="#0f172a"
          strokeOpacity="0.05"
          strokeWidth="1"
        />
      ))}
      <motion.path
        d={area}
        fill={`url(#area-${id})`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={viewport}
        transition={{ duration: 0.8, delay: 0.3 }}
      />
      <motion.path
        d={line}
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={viewport}
        transition={{ duration: 1.1, ease: 'easeInOut' }}
      />
      {showDots && (
        <motion.circle
          cx={last[0]}
          cy={last[1]}
          r="4"
          fill={stroke}
          stroke="#fff"
          strokeWidth="2"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={viewport}
          transition={{ duration: 0.4, delay: 1 }}
        />
      )}
    </svg>
  )
}

/* ─── Forecast chart (solid history + dashed projection) ─────── */

export function ForecastChart({
  data,
  splitAt,
  className,
}: {
  data: number[]
  splitAt: number
  className?: string
}) {
  const id = useId().replace(/:/g, '')
  const W = 320
  const H = 150
  const pad = 14
  const pts = scale(data, W, H, pad)
  const history = pts.slice(0, splitAt + 1)
  const future = pts.slice(splitAt)
  const solid = smoothPath(history)
  const dashed = smoothPath(future)
  const area = `${smoothPath(pts)} L ${pts[pts.length - 1][0]},${H - pad} L ${pts[0][0]},${H - pad} Z`
  const split = pts[splitAt]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('h-auto w-full', className)} fill="none">
      <defs>
        <linearGradient id={`fc-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.33, 0.66].map((g) => (
        <line key={g} x1={pad} x2={W - pad} y1={pad + (H - pad * 2) * g} y2={pad + (H - pad * 2) * g}
          stroke="#0f172a" strokeOpacity="0.05" strokeWidth="1" />
      ))}
      <motion.path d={area} fill={`url(#fc-${id})`} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
        viewport={viewport} transition={{ duration: 0.8, delay: 0.4 }} />
      <line x1={split[0]} x2={split[0]} y1={pad} y2={H - pad} stroke="#94a3b8" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 3" />
      <motion.path d={solid} stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={viewport}
        transition={{ duration: 0.8, ease: 'easeInOut' }} />
      <motion.path d={dashed} stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 5"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={viewport}
        transition={{ duration: 0.8, delay: 0.7, ease: 'easeInOut' }} />
      <motion.circle cx={future[future.length - 1][0]} cy={future[future.length - 1][1]} r="4" fill="#60A5FA"
        stroke="#fff" strokeWidth="2" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={viewport}
        transition={{ duration: 0.4, delay: 1.5 }} />
    </svg>
  )
}

/* ─── Bar chart (grouped or single) ──────────────────────────── */

export function BarChart({
  groups,
  colors = ['#2563EB', '#bfdbfe'],
  className,
}: {
  groups: number[][]
  colors?: string[]
  className?: string
}) {
  const W = 320
  const H = 150
  const pad = 14
  const max = Math.max(...groups.flat())
  const innerH = H - pad * 2
  const slot = (W - pad * 2) / groups.length
  const barW = Math.min(14, (slot * 0.6) / groups[0].length)
  const gap = 3

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('h-auto w-full', className)} fill="none">
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1={pad} x2={W - pad} y1={pad + innerH * (1 - g)} y2={pad + innerH * (1 - g)}
          stroke="#0f172a" strokeOpacity="0.05" strokeWidth="1" />
      ))}
      {groups.map((grp, gi) => {
        const groupW = grp.length * barW + (grp.length - 1) * gap
        const startX = pad + slot * gi + (slot - groupW) / 2
        return grp.map((v, bi) => {
          const barH = (v / max) * innerH
          const x = startX + bi * (barW + gap)
          return (
            <motion.rect
              key={`${gi}-${bi}`}
              x={x}
              width={barW}
              rx="3"
              fill={colors[bi % colors.length]}
              initial={{ height: 0, y: pad + innerH }}
              whileInView={{ height: barH, y: pad + innerH - barH }}
              viewport={viewport}
              transition={{ duration: 0.6, delay: gi * 0.06, ease: [0.16, 1, 0.3, 1] }}
            />
          )
        })
      })}
    </svg>
  )
}

/* ─── Donut chart ────────────────────────────────────────────── */

export function Donut({
  segments,
  className,
  centerLabel,
  centerSub,
}: {
  segments: { value: number; color: string }[]
  className?: string
  centerLabel?: string
  centerSub?: string
}) {
  const size = 160
  const stroke = 18
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const total = segments.reduce((s, x) => s + x.value, 0)
  let offset = 0

  return (
    <div className={cn('relative', className)}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {segments.map((seg, i) => {
          const frac = seg.value / total
          const dash = frac * c
          const el = (
            <motion.circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              initial={{ opacity: 0, strokeDasharray: `0 ${c}` }}
              whileInView={{ opacity: 1, strokeDasharray: `${dash} ${c - dash}` }}
              viewport={viewport}
              transition={{ duration: 0.9, delay: 0.2 + i * 0.12, ease: 'easeOut' }}
            />
          )
          offset += dash
          return el
        })}
      </svg>
      {centerLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tracking-tight text-slate-900">{centerLabel}</span>
          {centerSub && <span className="text-[10px] uppercase tracking-wider text-slate-400">{centerSub}</span>}
        </div>
      )}
    </div>
  )
}

/* ─── Animated progress bar ──────────────────────────────────── */

export function ProgressBar({
  value,
  color = '#2563EB',
  className,
  delay = 0,
}: {
  value: number
  color?: string
  className?: string
  delay?: number
}) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        viewport={viewport}
        transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}

/* ─── Sparkline (tiny inline trend) ──────────────────────────── */

export function Sparkline({
  data,
  stroke = '#2563EB',
  className,
}: {
  data: number[]
  stroke?: string
  className?: string
}) {
  const W = 100
  const H = 32
  const pts = scale(data, W, H, 3)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('h-8 w-full', className)} fill="none" preserveAspectRatio="none">
      <motion.path
        d={smoothPath(pts)}
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={viewport}
        transition={{ duration: 0.9 }}
      />
    </svg>
  )
}
