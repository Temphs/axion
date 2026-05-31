'use client'

import { Banknote, LayoutDashboard, Database, Lock } from 'lucide-react'
import { Eyebrow } from './ui'
import { Reveal, RevealGroup, RevealItem } from './motion'
import { useI18n } from './i18n'

const featureIcons = [Banknote, LayoutDashboard, Database, Lock]

export function FeatureGrid() {
  const { dict } = useI18n()
  const t = dict.featureGrid

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h2
            className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
          >
            {t.title}
          </h2>
        </Reveal>

        <RevealGroup className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4">
          {t.items.map((item, i) => {
            const Icon = featureIcons[i]
            const isComingSoon = item.comingSoon
            return (
              <RevealItem key={item.title}>
                <div
                  className={`group relative h-full rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 ${
                    isComingSoon
                      ? 'border-slate-200/50 bg-slate-50/80'
                      : 'border-slate-200/70 bg-white hover:border-blue-200 hover:shadow-[0_18px_40px_-24px_rgba(37,99,235,0.35)]'
                  }`}
                >
                  {isComingSoon && (
                    <span className="absolute right-4 top-4 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Soon
                    </span>
                  )}
                  <span
                    className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-110 ${
                      isComingSoon
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-blue-500/25'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3
                    className={`text-base font-semibold ${isComingSoon ? 'text-slate-400' : 'text-slate-900'}`}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{item.desc}</p>
                </div>
              </RevealItem>
            )
          })}
        </RevealGroup>
      </div>
    </section>
  )
}
