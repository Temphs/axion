'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

// Password field with a show/hide toggle and warnings for the two most common
// reasons a correct password is rejected: Caps Lock, and the keyboard left on
// the Greek layout (which turns "summer" into "σθμμερ").

const GREEK = /[Ͱ-Ͽἀ-῿]/

const TEXT = {
  el: {
    show: 'Εμφάνιση κωδικού',
    hide: 'Απόκρυψη κωδικού',
    caps: 'Το Caps Lock είναι ενεργό.',
    greek: 'Ο κωδικός περιέχει ελληνικούς χαρακτήρες — μήπως είναι ενεργό το ελληνικό πληκτρολόγιο;',
  },
  en: {
    show: 'Show password',
    hide: 'Hide password',
    caps: 'Caps Lock is on.',
    greek: 'Your password contains Greek letters. Is the keyboard set to Greek?',
  },
}

export function PasswordInput({
  name,
  value,
  onChange,
  autoComplete,
  lang = 'el',
  className,
  placeholder = '••••••••',
  minLength,
  required = true,
}: {
  name: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  lang?: string
  className?: string
  placeholder?: string
  minLength?: number
  required?: boolean
}) {
  const t = TEXT[lang === 'en' ? 'en' : 'el']
  const [visible, setVisible] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  const trackCaps = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // getModifierState is missing on some synthetic/mobile events; treat as off.
    setCapsLock(typeof e.getModifierState === 'function' && e.getModifierState('CapsLock'))
  }

  return (
    <div>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={trackCaps}
          onKeyUp={trackCaps}
          onBlur={() => setCapsLock(false)}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required={required}
          minLength={minLength}
          maxLength={256}
          placeholder={placeholder}
          className={`${className ?? ''} pr-11`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t.hide : t.show}
          title={visible ? t.hide : t.show}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl text-slate-400 transition hover:text-slate-600"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {capsLock && <p className="mt-1 text-xs font-medium text-amber-700">{t.caps}</p>}
      {GREEK.test(value) && <p className="mt-1 text-xs font-medium text-amber-700">{t.greek}</p>}
    </div>
  )
}
