'use client'

import { Info } from 'lucide-react'

// Small hover tooltip used to document metric formulas.
export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <Info size={13} className="cursor-help text-slate-400 transition group-hover:text-slate-600" />
      {/* Right-anchored by default so it can never push the page wider than the
          viewport on narrow screens; centred once there is room. */}
      <span className="pointer-events-none absolute bottom-full right-0 z-20 mb-1.5 w-56 max-w-[70vw] rounded-lg bg-slate-800 px-2.5 py-2 text-left text-[11px] font-normal leading-snug text-slate-100 opacity-0 shadow-lg transition group-hover:opacity-100 sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
        {text}
      </span>
    </span>
  )
}
