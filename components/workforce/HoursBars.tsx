'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { hrs } from '@/lib/format'

export type HoursBar = { month: string; label: string; hours: number }

// The animated bars of the hours panel, with a hover readout so the exact hours
// for a month can be read rather than estimated off the gridlines. Split out
// from HoursOverviewCard so the card itself stays a server component and can
// take Lucide icons as props.
export function HoursBars({ data, max }: { data: HoursBar[]; max: number }) {
  const [active, setActive] = useState<number | null>(null)
  const shown = active !== null ? data[active] : null

  return (
    <>
      <div
        className="absolute inset-0 flex items-stretch gap-1.5 pl-13"
        onMouseLeave={() => setActive(null)}
      >
        {data.map((d, i) => (
          <button
            key={d.month}
            type="button"
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            aria-label={`${d.label}: ${hrs(d.hours)}`}
            className="flex h-full flex-1 cursor-default items-end justify-center outline-none"
          >
            <motion.span
              className={`block w-full max-w-[10px] rounded-full transition-colors ${
                active === i ? 'bg-white' : 'bg-white/90'
              }`}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(d.hours > 0 ? 2 : 0, (d.hours / max) * 100)}%` }}
              transition={{ duration: 0.55, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            />
          </button>
        ))}
      </div>

      {shown && (
        <div className="pointer-events-none absolute right-0 top-0 rounded-lg bg-white/10 px-2 py-1 text-right backdrop-blur-sm">
          <p className="text-[10px] text-white/60">{shown.label}</p>
          <p className="text-sm font-bold tabular-nums text-white">{hrs(shown.hours)}</p>
        </div>
      )}
    </>
  )
}
