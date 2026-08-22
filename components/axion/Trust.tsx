'use client'

import { CalendarDays, ClipboardCheck, EyeOff, ShieldCheck } from 'lucide-react'
import { Reveal, RevealGroup, RevealItem } from './motion'
import { useI18n } from './i18n'

const indicatorIcons = [CalendarDays, ClipboardCheck, EyeOff]

export function Trust() {
  const { dict } = useI18n()
  const indicators = dict.trust.indicators.map((item, i) => ({
    ...item,
    icon: indicatorIcons[i],
  }))

  return (
    <section className="border-y border-slate-100 bg-slate-50/50 px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {dict.trust.eyebrow}
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            {dict.trust.badges.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                {b}
              </span>
            ))}
          </div>
        </Reveal>

        <RevealGroup className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-3">
          {indicators.map((item) => (
            <RevealItem key={item.title}>
              <div className="group flex h-full items-start gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(37,99,235,0.35)]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.desc}</p>
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
