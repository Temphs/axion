'use client'

import { Mail, MapPin, AtSign, Globe, Share2 } from 'lucide-react'
import { Logo } from './Logo'
import { useI18n } from './i18n'

export function Footer() {
  const { dict } = useI18n()
  const t = dict.footer
  const columns = t.columns

  return (
    <footer id="contact" className="border-t border-slate-200 bg-white px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              {t.tagline}
            </p>
            <div className="mt-5 space-y-2 text-sm text-slate-500">
              <a href="mailto:hello@axion.io" className="flex items-center gap-2 hover:text-blue-600">
                <Mail className="h-4 w-4" /> hello@axion.io
              </a>
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {t.location}
              </span>
            </div>
            <div className="mt-5 flex gap-2">
              {[AtSign, Globe, Share2].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                  aria-label="Social link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8">
            {columns.map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold text-slate-900">{col.title}</h4>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-sm text-slate-500 transition-colors hover:text-blue-600">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-7 sm:flex-row">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Axion. {t.rights}
          </p>
          <div className="flex gap-6 text-xs text-slate-400">
            {t.legal.map((label) => (
              <a key={label} href="#" className="hover:text-slate-600">
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
