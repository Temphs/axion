'use client'

import { Check } from 'lucide-react'
import { Eyebrow } from './ui'
import { Reveal } from './motion'
import { useI18n } from './i18n'

export function Solution() {
  const { dict } = useI18n()
  const t = dict.solution

  return (
    <section id="solution" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <h2
              className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
              style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
            >
              {t.title}
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600">{t.subtitle}</p>
          </Reveal>

          <Reveal delay={0.1}>
            <ul className="space-y-5">
              {t.items.map((item, i) => (
                <li key={item.title} className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                    <div className="mt-0.5 text-sm leading-relaxed text-slate-500">{item.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
