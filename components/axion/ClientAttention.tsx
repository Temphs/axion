'use client'

import { TriangleAlert } from 'lucide-react'
import { Eyebrow } from './ui'
import { Reveal, RevealGroup, RevealItem } from './motion'
import { useI18n } from './i18n'

// Decision support, capped at three items. The moment this becomes a feed,
// owners stop reading it — so the cap is the feature.
export function ClientAttention() {
  const { dict } = useI18n()
  const t = dict.attention

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-5">
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <h2
              className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
              style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
            >
              {t.title}
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600">{t.subtitle}</p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">{t.note}</p>
          </Reveal>

          <RevealGroup className="space-y-3 lg:col-span-7">
            {t.items.map((item) => (
              <RevealItem key={item.name}>
                <div className="group flex items-start gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-[0_18px_40px_-24px_rgba(245,158,11,0.3)]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500 transition-colors group-hover:bg-amber-100">
                    <TriangleAlert className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{item.reason}</p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  )
}
