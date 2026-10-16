'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

// Secondary sections on phones: folded into one tappable row so the page
// stays short, opened on demand. Tablets and desktop always show the content
// and never see the row.
export function MobileFold({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-white/95 px-4 py-3 text-left shadow-sm active:bg-white md:hidden ${open ? 'mb-3' : ''}`}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-900">{label}</span>
          {hint && <span className="block truncate text-xs text-slate-400">{hint}</span>}
        </span>
        <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={open ? '' : 'hidden md:block'}>{children}</div>
    </div>
  )
}
