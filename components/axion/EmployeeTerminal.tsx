'use client'

import { Check, ChevronRight, Search, ShieldCheck } from 'lucide-react'
import { Eyebrow } from './ui'
import { Reveal } from './motion'
import { useI18n } from './i18n'

// The adoption objection answered visually: this is the whole employee screen.
// A phone frame rather than a browser window, because that is where it lives.
export function EmployeeTerminal() {
  const { dict } = useI18n()
  const t = dict.terminal
  const m = t.mock

  return (
    <section className="bg-slate-50/70 px-4 py-16 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <h2
              className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
              style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
            >
              {t.title}
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600">{t.subtitle}</p>

            <ul className="mt-7 space-y-4">
              {t.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <span className="text-sm leading-relaxed text-slate-600">{bullet}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <p className="text-sm leading-relaxed text-slate-600">{t.objection}</p>
            </div>
          </Reveal>

          {/* phone mockup */}
          <Reveal delay={0.1}>
            <div className="relative mx-auto w-full max-w-[300px]">
              <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[48px] bg-gradient-to-tr from-blue-400/25 via-sky-300/15 to-indigo-400/25 blur-3xl" />
              <div className="pointer-events-none overflow-hidden rounded-[2rem] border-[6px] border-slate-900 bg-slate-100 shadow-[0_30px_70px_-25px_rgba(15,23,42,0.5)]">
                {/* app header */}
                <div className="bg-gradient-to-br from-blue-700 to-blue-500 px-5 pb-6 pt-6 text-white">
                  <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-white/30" />
                  <p className="text-xs text-blue-100">{m.greeting}</p>
                  <p className="font-display text-lg font-bold tracking-tight">{m.name}</p>
                  <div className="mt-3 rounded-xl bg-white/15 px-3 py-2 backdrop-blur">
                    <div className="text-sm font-semibold leading-tight">{m.today}</div>
                    <div className="text-[10px] text-blue-100">{m.dayHours}</div>
                  </div>
                </div>

                <div className="space-y-2.5 p-3">
                  {/* client picker */}
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      {m.clientLabel}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {m.clients.map((c, i) => (
                        <span
                          key={c}
                          className={`truncate rounded-lg border-2 px-2 py-2 text-[11px] font-semibold ${
                            i === 0
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-white text-slate-600'
                          }`}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1.5 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-[10px] font-medium text-slate-400">
                      <Search className="h-3 w-3" /> {m.searchLabel}
                    </div>

                    <p className="mb-1.5 mt-3 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      {m.hoursLabel}
                    </p>
                    <div className="flex gap-1.5">
                      {['0,5', '1', '2', '4', '8'].map((h, i) => (
                        <span
                          key={h}
                          className={`flex-1 rounded-lg border-2 py-1.5 text-center text-[11px] font-bold ${
                            i === 2
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          {h}
                        </span>
                      ))}
                    </div>

                    <p className="mb-1.5 mt-3 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      {m.taskLabel}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.tasks.map((task, i) => (
                        <span
                          key={task}
                          className={`rounded-lg border-2 px-2 py-1.5 text-[10px] font-semibold ${
                            i === 0
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          {task}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 rounded-xl bg-blue-600 py-2.5 text-center text-xs font-semibold text-white">
                      {m.submit}
                    </div>
                  </div>

                  {/* today's entries */}
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="text-[11px] font-semibold text-slate-900">{m.listTitle}</span>
                      <span className="font-display text-xs font-bold text-slate-900">6,5 ώ</span>
                    </div>
                    {m.entries.map((e) => (
                      <div
                        key={e.client}
                        className="flex items-center justify-between gap-2 border-t border-slate-50 py-1.5"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-medium text-slate-700">
                            {e.client}
                          </span>
                          <span className="block truncate text-[9px] text-slate-400">{e.task}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold tabular-nums text-slate-600">
                          {e.hours}
                          <ChevronRight className="h-3 w-3 text-slate-300" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
