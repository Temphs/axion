'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

// A locale-independent date field that always shows and accepts dd/mm/yyyy.
// The value passed in/out is ISO (yyyy-mm-dd) so the rest of the app is unchanged.
// A calendar button opens the browser's native picker via a hidden date input.

function isoToDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

function displayToIso(s: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim())
  if (!m) return null
  const dd = Number(m[1])
  const mm = Number(m[2])
  const yyyy = Number(m[3])
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  // Reject impossible dates (e.g. 31/02) by round-tripping through Date.
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd))
  if (dt.getUTCFullYear() !== yyyy || dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

// Insert slashes as the user types: up to 8 digits -> dd/mm/yyyy.
function autoFormat(s: string): string {
  const d = s.replace(/\D/g, '').slice(0, 8)
  const parts: string[] = []
  if (d.length > 0) parts.push(d.slice(0, 2))
  if (d.length > 2) parts.push(d.slice(2, 4))
  if (d.length > 4) parts.push(d.slice(4, 8))
  return parts.join('/')
}

export function DateField({
  value,
  onCommit,
  inputClassName,
  className,
  ariaLabel,
  placeholder = 'ηη/μμ/εεεε',
}: {
  value: string
  onCommit: (iso: string) => void
  inputClassName?: string
  className?: string
  ariaLabel?: string
  placeholder?: string
}) {
  const [text, setText] = useState(() => isoToDisplay(value))
  const nativeRef = useRef<HTMLInputElement>(null)

  // Re-sync the visible text whenever the external value changes (clear, preset, navigation).
  useEffect(() => {
    setText(isoToDisplay(value))
  }, [value])

  function handleChange(raw: string) {
    const formatted = autoFormat(raw)
    setText(formatted)
    if (formatted === '') {
      if (value) onCommit('')
      return
    }
    const iso = displayToIso(formatted)
    if (iso && iso !== value) onCommit(iso)
  }

  function handleBlur() {
    if (text.trim() === '') {
      if (value) onCommit('')
      return
    }
    const iso = displayToIso(text)
    if (iso) {
      if (iso !== value) onCommit(iso)
    } else {
      setText(isoToDisplay(value)) // revert an incomplete/invalid entry
    }
  }

  function openPicker() {
    const n = nativeRef.current
    if (!n) return
    try {
      n.showPicker?.()
    } catch {
      /* showPicker unsupported or blocked — silently ignore */
    }
  }

  return (
    <div className={cn('relative', className)}>
      <input
        type="text"
        inputMode="numeric"
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        className={cn(inputClassName, 'pr-9')}
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label="Άνοιγμα ημερολογίου"
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-slate-400 transition hover:text-blue-600"
      >
        <CalendarDays size={16} />
        <input
          ref={nativeRef}
          type="date"
          value={value}
          onChange={(e) => onCommit(e.target.value)}
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      </button>
    </div>
  )
}
