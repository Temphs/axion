'use client'

import { Eyebrow } from './ui'
import { Reveal } from './motion'
import { useI18n } from './i18n'

// Factual operational rows only. No ranking, no score, no percentage whose
// definition the reader would have to guess.
export function TeamOverview() {
  const { dict } = useI18n()
  const t = dict.team

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h2
            className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
          >
            {t.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">{t.subtitle}</p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_18px_40px_-24px_rgba(37,99,235,0.18)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400">
                    {t.columns.map((c, i) => (
                      <th key={c} className={`px-5 py-3 font-medium ${i > 0 ? 'text-right' : ''}`}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((r) => (
                    <tr key={r.name} className="border-t border-slate-50">
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 text-xs font-bold text-white">
                            {r.name.charAt(0)}
                          </span>
                          <span className="font-medium text-slate-800">{r.name}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold tabular-nums text-slate-900">
                        {r.logged}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums text-slate-600">{r.client}</td>
                      <td className="px-5 py-4 text-right tabular-nums text-slate-500">{r.overhead}</td>
                      <td className="px-5 py-4 text-right tabular-nums text-slate-600">{r.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-center text-[11px] text-slate-400">
              {t.note}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
