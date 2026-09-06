'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'

// Small hover tooltip used to document metric formulas.
//
// The bubble is rendered into <body> and positioned with `fixed`, because the
// tips sit inside horizontally scrolling tables: an absolutely positioned
// bubble gets clipped by that scroll container and appears as a cut-off dark
// slab over the header row. A portal escapes every ancestor's overflow.

const WIDTH = 240
const MARGIN = 8

type Spot = { left: number; top: number; below: boolean }

export function InfoTip({ text }: { text: string }) {
  const anchor = useRef<HTMLSpanElement>(null)
  const [spot, setSpot] = useState<Spot | null>(null)

  function place() {
    const el = anchor.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const half = WIDTH / 2
    // Keep the bubble inside the viewport even when the tip sits in the last
    // column of a wide table.
    const left = Math.min(Math.max(r.left + r.width / 2, half + MARGIN), window.innerWidth - half - MARGIN)
    // Flip under the icon when there is no room above it.
    const below = r.top < 96
    setSpot({ left, top: below ? r.bottom + 6 : r.top - 6, below })
  }

  const hide = () => setSpot(null)

  // A tooltip pinned to viewport coordinates goes stale the moment anything
  // moves, so dismiss it rather than let it drift away from its icon.
  useEffect(() => {
    if (!spot) return
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [spot])

  return (
    <span
      ref={anchor}
      className="inline-flex align-middle"
      onMouseEnter={place}
      onMouseLeave={hide}
      onFocus={place}
      onBlur={hide}
    >
      <Info
        size={13}
        tabIndex={0}
        role="note"
        aria-label={text}
        className="cursor-help text-slate-400 outline-none transition hover:text-slate-600 focus-visible:text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-500/50"
      />
      {spot &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            role="tooltip"
            style={{
              left: spot.left,
              top: spot.top,
              width: WIDTH,
              transform: `translate(-50%, ${spot.below ? '0' : '-100%'})`,
            }}
            className="pointer-events-none fixed z-[100] rounded-lg bg-slate-800 px-2.5 py-2 text-left text-[11px] font-normal leading-snug text-slate-100 shadow-lg"
          >
            {text}
          </span>,
          document.body
        )}
    </span>
  )
}
