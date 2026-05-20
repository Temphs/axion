'use client'

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { Dictionary } from '@/lib/dictionaries'
import type { Locale } from '@/lib/i18n'

type I18nValue = { lang: Locale; dict: Dictionary }

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({
  lang,
  dict,
  children,
}: {
  lang: Locale
  dict: Dictionary
  children: ReactNode
}) {
  return <I18nContext.Provider value={{ lang, dict }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used within an I18nProvider')
  return value
}
