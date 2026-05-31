'use client'

import { Check } from 'lucide-react'
import { Button, Eyebrow } from './ui'
import { Reveal } from './motion'
import { useI18n } from './i18n'

function AudienceCard({
  eyebrow,
  title,
  items,
  cta,
  variant = 'blue',
}: {
  eyebrow: string
  title: string
  items: string[]
  cta: string
  variant?: 'blue' | 'white'
}) {
  const isBlue = variant === 'blue'
  return (
    <div
      className={`relative h-full overflow-hidden rounded-3xl p-8 sm:p-10 ${
        isBlue
          ? 'bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 shadow-[0_32px_60px_-20px_rgba(37,99,235,0.5)]'
          : 'border border-slate-200/80 bg-white shadow-sm'
      }`}
    >
      {isBlue && (
        <>
          <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_0%,#000_50%,transparent_100%)]" />
        </>
      )}
      <div className="relative">
        <Eyebrow className={isBlue ? 'text-blue-200' : undefined}>{eyebrow}</Eyebrow>
        <h3
          className={`mt-3 text-2xl font-bold tracking-tight sm:text-3xl ${isBlue ? 'text-white' : 'text-slate-900'}`}
          style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
        >
          {title}
        </h3>
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  isBlue ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
                }`}
              >
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              <span className={`text-sm leading-relaxed ${isBlue ? 'text-blue-50' : 'text-slate-600'}`}>
                {item}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Button href="#lead" variant={isBlue ? 'light' : 'primary'} size="md">
            {cta}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function Audiences() {
  const { dict } = useI18n()
  const t = dict.audiences

  return (
    <section id="solutions" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <AudienceCard
              eyebrow={t.accounting.eyebrow}
              title={t.accounting.title}
              items={t.accounting.items}
              cta={t.accounting.cta}
              variant="blue"
            />
          </Reveal>
          <Reveal delay={0.1}>
            <AudienceCard
              eyebrow={t.sme.eyebrow}
              title={t.sme.title}
              items={t.sme.items}
              cta={t.sme.cta}
              variant="white"
            />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
