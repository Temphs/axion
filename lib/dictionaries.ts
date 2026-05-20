import el, { type Dictionary } from './dictionaries/el'
import en from './dictionaries/en'
import type { Locale } from './i18n'

export type { Dictionary }

const dictionaries: Record<Locale, Dictionary> = { el, en }

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}
