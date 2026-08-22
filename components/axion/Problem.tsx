'use client'

import { EyeOff, Scale, Coins } from 'lucide-react'
import { Eyebrow } from './ui'
import { RevealGroup, RevealItem, Reveal } from './motion'
import { useI18n } from './i18n'

const icons = [EyeOff, Scale, Coins]

export function Problem() {
  const { dict } = useI18n()
  const t = dict.problem

  return (
    <section id="problem" className="scroll-mt-20 bg-slate-50/70 px-4 py-16 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow className="text-amber-600">{t.eyebrow}</Eyebrow>
          <h2
            className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
          >
            {t.title}
          </h2>
        </Reveal>

        <RevealGroup className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-3">
          {t.items.map((item, i) => {
            const Icon = icons[i]
            return (
              <RevealItem key={item.title}>
                <div className="group h-full rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-100 hover:shadow-[0_18px_40px_-24px_rgba(245,158,11,0.28)]">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-500 transition-all group-hover:scale-110 group-hover:bg-amber-100">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{item.desc}</p>
                </div>
              </RevealItem>
            )
          })}
        </RevealGroup>

        {/* The turn: the problem statement resolves into what Axion gives you. */}
        <Reveal delay={0.15}>
          <p className="mx-auto mt-10 max-w-2xl text-balance text-center text-base font-medium leading-relaxed text-slate-700 sm:text-lg">
            {t.note}
          </p>
        </Reveal>
      </div>
    </section>
  )
}
