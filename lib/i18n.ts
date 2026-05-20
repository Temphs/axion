export const locales = ['el', 'en'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'el'

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}
