'use client'

import { Timer, Calculator, LineChart, ArrowRight } from 'lucide-react'
import { Eyebrow } from './ui'
import { Reveal, RevealGroup, RevealItem } from './motion'
import { useI18n } from './i18n'

const stepIcons = [Timer, Calculator, LineChart]

// The chain the whole product rests on, drawn once so the reader can hold it
// in their head for the rest of the page.
const CHAIN = ['Employee', 'Time', 'Client', 'Labor cost', 'Margin']

export function HowItWorks() {
  const { dict } = useI18n()
  const t = dict.howItWorks
  const steps = t.steps.map((step, i) => ({ ...step, icon: stepIcons[i] }))

  return (
    <section id="how-it-works" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-28">
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

        {/* the model, in five words */}
        <Reveal delay={0.08}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2">
            {CHAIN.map((node, i) => (
              <span key={node} className="flex items-center gap-1.5">
                <span className="rounded-lg border border-blue-100 bg-blue-50/70 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                  {node}
                </span>
                {i < CHAIN.length - 1 && <ArrowRight className="h-3 w-3 shrink-0 text-blue-300" />}
              </span>
            ))}
          </div>
        </Reveal>

        <div className="relative mt-10 sm:mt-14">
          <div className="absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent lg:block" />
          <RevealGroup className="grid gap-5 sm:grid-cols-3">
            {steps.map((s, i) => (
              <RevealItem key={s.title}>
                <div className="group relative h-full rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(37,99,235,0.35)]">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
                      <s.icon className="h-5 w-5" />
                    </span>
                    <span className="text-3xl font-bold tracking-tight text-slate-100 transition-colors group-hover:text-blue-100">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{s.desc}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  )
}
