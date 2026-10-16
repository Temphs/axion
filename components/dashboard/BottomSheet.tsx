'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

// Phone bottom sheet: slides over the page, closes on backdrop tap, Escape or
// the close button, and stops the page behind it from scrolling while open.
export function BottomSheet({
  open,
  onClose,
  title,
  label = title,
  subtitle,
  children,
  className = 'lg:hidden',
}: {
  open: boolean
  onClose: () => void
  title: string
  // Accessible name when it differs from the visible title.
  label?: string
  subtitle?: string
  children: ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className={`fixed inset-0 z-50 flex items-end bg-slate-900/40 backdrop-blur-[2px] ${className}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" />
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
            {subtitle && <p className="truncate text-xs text-slate-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Κλείσιμο"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
