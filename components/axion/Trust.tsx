'use client'

import { BrainCircuit, ShieldCheck, Activity } from 'lucide-react'
import { Reveal, RevealGroup, RevealItem } from './motion'

const indicators = [
  {
    icon: BrainCircuit,
    title: 'AI-powered',
    desc: 'Prediction models trained on real invoice activity.',
  },
  {
    icon: ShieldCheck,
    title: 'AADE / MyData Ready',
    desc: 'Native integration with Greek e-invoicing standards.',
  },
  {
    icon: Activity,
    title: 'Real-time insights',
    desc: 'Live dashboards that update as transactions post.',
  },
]

const logos = ['NorthBay', 'HelvETIA', 'Meridian', 'Aegis & Co', 'Lumina', 'Kanto']

export function Trust() {
  return (
    <section className="border-y border-slate-100 bg-slate-50/50 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Built for accounting firms and SMEs
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
            {logos.map((l) => (
              <span
                key={l}
                className="text-lg font-semibold tracking-tight text-slate-400"
                style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
              >
                {l}
              </span>
            ))}
          </div>
        </Reveal>

        <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-3">
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
