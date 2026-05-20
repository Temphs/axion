'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from './i18n'
import { locales, type Locale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

function swapLocale(pathname: string, target: Locale): string {
  const segments = pathname.split('/')
  segments[1] = target
  return segments.join('/') || `/${target}`
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang } = useI18n()
  const pathname = usePathname() || `/${lang}`

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white/60 p-0.5',
        className
      )}
      role="group"
      aria-label="Language"
    >
      {locales.map((l) => (
        <Link
          key={l}
          href={swapLocale(pathname, l)}
          aria-current={l === lang ? 'true' : undefined}
          className={cn(
            'rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide transition-colors',
            l === lang
              ? 'bg-blue-600 text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
          )}
        >
          {l}
        </Link>
      ))}
    </div>
  )
}
