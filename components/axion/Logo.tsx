'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * Geometric Axion mark: a gradient tile holding an abstract "A" that doubles
 * as an upward trend peak — growth, structure, financial intelligence.
 */
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  const fill = `axion-fill-${id}`
  const glow = `axion-glow-${id}`

  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={cn('h-9 w-9', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={fill} x1="6" y1="3" x2="34" y2="37" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="0.5" stopColor="#2563EB" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <radialGradient id={glow} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
          gradientTransform="translate(11 9) rotate(45) scale(26)">
          <stop stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Squircle tile */}
      <rect x="0.5" y="0.5" width="39" height="39" rx="11" fill={`url(#${fill})`} />
      <rect x="0.5" y="0.5" width="39" height="39" rx="11" fill={`url(#${glow})`} />
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="10.75" stroke="#fff" strokeOpacity="0.18" strokeWidth="1" />

      {/* Abstract "A" / rising peak */}
      <path
        d="M9 29.5 L20 10.5 L31 29.5"
        stroke="#fff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Crossbar — the ledger line completing the A */}
      <path
        d="M14.7 22.4 L25.3 22.4"
        stroke="#fff"
        strokeOpacity="0.85"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Logo({
  className,
  variant = 'dark',
  showWordmark = true,
}: {
  className?: string
  variant?: 'dark' | 'light'
  showWordmark?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {showWordmark && (
        <span
          className={cn(
            'text-[1.35rem] font-bold tracking-tight leading-none',
            variant === 'light' ? 'text-white' : 'text-slate-900'
          )}
          style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
        >
          Axion
        </span>
      )}
    </span>
  )
}
