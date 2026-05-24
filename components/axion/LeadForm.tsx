'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight, Check, ShieldCheck } from 'lucide-react'
import { Button } from './ui'
import { useI18n } from './i18n'

type Status = 'idle' | 'sending' | 'success'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LeadForm() {
  const { dict } = useI18n()
  const t = dict.lead

  const [status, setStatus] = useState<Status>('idle')
  const [values, setValues] = useState({ name: '', email: '', phone: '', company: '' })
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})

  function update(field: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field as 'name' | 'email']) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const nextErrors: typeof errors = {}
    if (!values.name.trim()) nextErrors.name = t.requiredError
    if (!EMAIL_RE.test(values.email)) nextErrors.email = t.emailError
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setStatus('sending')
    try {
      // TODO: wire to your backend / CRM / email service, e.g.
      // await fetch('/api/lead', { method: 'POST', body: JSON.stringify(values) })
      await new Promise((r) => setTimeout(r, 700))
      setStatus('success')
    } catch {
      setStatus('idle')
    }
  }

  const inputBase =
    'h-12 w-full rounded-xl border bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30'

  return (
    <section id="lead" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.25)] sm:p-8">
          {status === 'success' ? (
            <div className="flex flex-col items-center py-8 text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="h-7 w-7" strokeWidth={2.5} />
              </span>
              <h2
                className="text-2xl font-bold tracking-tight text-slate-900"
                style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
              >
                {t.successTitle}
              </h2>
              <p className="mt-2 max-w-sm text-base leading-relaxed text-slate-600">{t.success}</p>
            </div>
          ) : (
            <>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                {t.eyebrow}
              </span>
              <h2
                className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
                style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
              >
                {t.title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-600">{t.subtitle}</p>

              <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
                <div>
                  <label htmlFor="lead-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                    {t.name}
                  </label>
                  <input
                    id="lead-name"
                    type="text"
                    autoComplete="name"
                    enterKeyHint="next"
                    placeholder={t.namePlaceholder}
                    value={values.name}
                    onChange={(e) => update('name', e.target.value)}
                    aria-invalid={!!errors.name}
                    className={`${inputBase} ${errors.name ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="lead-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                    {t.email}
                  </label>
                  <input
                    id="lead-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    enterKeyHint="next"
                    placeholder={t.emailPlaceholder}
                    value={values.email}
                    onChange={(e) => update('email', e.target.value)}
                    aria-invalid={!!errors.email}
                    className={`${inputBase} ${errors.email ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="lead-phone" className="mb-1.5 block text-sm font-medium text-slate-700">
                      {t.phone}
                    </label>
                    <input
                      id="lead-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder={t.phonePlaceholder}
                      value={values.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      className={`${inputBase} border-slate-200`}
                    />
                  </div>
                  <div>
                    <label htmlFor="lead-company" className="mb-1.5 block text-sm font-medium text-slate-700">
                      {t.company}
                    </label>
                    <input
                      id="lead-company"
                      type="text"
                      autoComplete="organization"
                      enterKeyHint="send"
                      placeholder={t.companyPlaceholder}
                      value={values.company}
                      onChange={(e) => update('company', e.target.value)}
                      className={`${inputBase} border-slate-200`}
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={status === 'sending'}>
                  {status === 'sending' ? t.sending : t.submit}
                  {status !== 'sending' && <ArrowRight className="h-4 w-4" />}
                </Button>

                <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t.privacy}
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
