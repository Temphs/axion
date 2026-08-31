'use client'

import { BarChart3, Landmark, Users2 } from 'lucide-react'
import { Eyebrow } from './ui'
import { Reveal, RevealGroup, RevealItem } from './motion'
import { useI18n } from './i18n'

// The roadmap, stated honestly. A "coming soon" module is drawn as clearly
// unfinished — muted, no gradient, no shadow — so nobody buys on a promise.
const moduleIcons = [Users2, BarChart3, Landmark]

export function Modules() {
  const { dict } = useI18n()
  const t = dict.modules

  return (
    <section id="modules" className="scroll-mt-20 bg-slate-50/70 px-4 py-16 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h2
            className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
          >
            {t.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">{t.subtitle}</p>
        </Reveal>

        <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-3">
          {t.items.map((item, i) => {
            const Icon = moduleIcons[i]
            return (
              <RevealItem key={item.name}>
                <div
                  className={`h-full rounded-2xl border p-6 transition-all duration-300 ${
                    item.available
                      ? 'border-blue-200 bg-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.35)] hover:-translate-y-1'
                      : 'border-dashed border-slate-300 bg-slate-50'
                  }`}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                        item.available
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                          : 'bg-slate-200/70 text-slate-400'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                        item.available
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-200/70 text-slate-500'
                      }`}
                    >
                      {item.available ? t.availableLabel : t.soonLabel}
                    </span>
                  </div>
                  <h3
                    className={`text-base font-semibold ${
                      item.available ? 'text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    {item.name}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{item.desc}</p>
                </div>
              </RevealItem>
            )
          })}
        </RevealGroup>

        <Reveal delay={0.15}>
          <p className="mx-auto mt-8 max-w-xl text-center text-sm leading-relaxed text-slate-400">
            {t.note}
          </p>
        </Reveal>
      </div>
    </section>
  )
}
