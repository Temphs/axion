'use client'

import { ShieldCheck, TrendingUp, Users, Lightbulb, LayoutGrid } from 'lucide-react'
import { Eyebrow } from './ui'
import { Reveal, RevealGroup, RevealItem } from './motion'
import { useI18n } from './i18n'

const benefitMeta = [
  { icon: ShieldCheck, span: 'lg:col-span-2' },
  { icon: TrendingUp, span: 'lg:col-span-2' },
  { icon: Users, span: 'lg:col-span-2' },
  { icon: Lightbulb, span: 'lg:col-span-3' },
  { icon: LayoutGrid, span: 'lg:col-span-3' },
]

export function Benefits() {
  const { dict } = useI18n()
  const benefits = dict.benefits.items.map((item, i) => ({ ...item, ...benefitMeta[i] }))

  return (
    <section id="benefits" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>{dict.benefits.eyebrow}</Eyebrow>
          <h2
            className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
          >
            {dict.benefits.title}
          </h2>
        </Reveal>

        <RevealGroup className="mt-10 grid gap-4 sm:mt-14 lg:grid-cols-6">
          {benefits.map((b) => (
            <RevealItem key={b.title} className={b.span}>
              <div className="group h-full rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_40px_-24px_rgba(37,99,235,0.35)]">
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-transform group-hover:scale-110">
                  <b.icon className="h-5 w-5" />
                </span>
                <h3 className="text-base font-semibold text-slate-900">{b.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{b.desc}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
