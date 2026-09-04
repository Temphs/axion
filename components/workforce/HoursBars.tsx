'use client'

import { motion } from 'framer-motion'
import { hrs } from '@/lib/format'

export type HoursBar = { month: string; label: string; hours: number }

// The animated bars of the hours panel. Split out from HoursOverviewCard so the
// card itself stays a server component and can take Lucide icons as props.
export function HoursBars({ data, max }: { data: HoursBar[]; max: number }) {
  return (
    <div className="absolute inset-0 flex items-stretch gap-1.5 pl-13">
      {data.map((d, i) => (
        <div
          key={d.month}
          className="group flex h-full flex-1 items-end justify-center"
          title={`${d.label}: ${hrs(d.hours)}`}
        >
          <motion.div
            className="w-full max-w-[10px] rounded-full bg-white/90 transition-colors group-hover:bg-white"
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(d.hours > 0 ? 2 : 0, (d.hours / max) * 100)}%` }}
            transition={{ duration: 0.55, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      ))}
    </div>
  )
}
