'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, MailCheck } from 'lucide-react'
import { Button } from './ui'

// "Forgot password" request form and the "choose a new password" form the
// emailed link opens. Rendered inside a Card, like AuthForm.

const STRINGS = {
  el: {
    forgotTitle: 'Ξεχάσατε τον κωδικό;',
    forgotSub: 'Δώστε το email του λογαριασμού και θα σας στείλουμε σύνδεσμο επαναφοράς.',
    email: 'Email',
    send: 'Αποστολή συνδέσμου',
    sentTitle: 'Ελέγξτε το email σας',
    sent: 'Αν υπάρχει λογαριασμός με αυτό το email, θα λάβετε σύνδεσμο επαναφοράς σε λίγα λεπτά. Ο σύνδεσμος ισχύει 30 λεπτά.',
    backToLogin: 'Επιστροφή στη σύνδεση',
    resetTitle: 'Νέος κωδικός',
    resetSub: 'Επιλέξτε νέο κωδικό για τον λογαριασμό σας.',
    newPassword: 'Νέος κωδικός',
    confirm: 'Επιβεβαίωση κωδικού',
    minHint: 'Τουλάχιστον 8 χαρακτήρες',
    save: 'Αποθήκευση κωδικού',
    mismatch: 'Οι κωδικοί δεν ταιριάζουν',
    invalid: 'Ο σύνδεσμος δεν είναι έγκυρος ή έχει λήξει. Ζητήστε νέο.',
    requestNew: 'Ζητήστε νέο σύνδεσμο',
    doneTitle: 'Ο κωδικός άλλαξε',
    done: 'Αποσυνδεθήκατε από όλες τις συσκευές. Συνδεθείτε με τον νέο κωδικό.',
    login: 'Σύνδεση',
    tooMany: 'Πολλές προσπάθειες — δοκιμάστε ξανά αργότερα.',
    network: 'Σφάλμα δικτύου',
    generic: 'Κάτι πήγε στραβά',
  },
  en: {
    forgotTitle: 'Forgot your password?',
    forgotSub: "Enter your account email and we'll send you a reset link.",
    email: 'Email',
    send: 'Send reset link',
    sentTitle: 'Check your email',
    sent: 'If an account exists for that email, a reset link is on its way. The link works for 30 minutes.',
    backToLogin: 'Back to sign in',
    resetTitle: 'New password',
    resetSub: 'Choose a new password for your account.',
    newPassword: 'New password',
    confirm: 'Confirm password',
    minHint: 'At least 8 characters',
    save: 'Save password',
    mismatch: "Passwords don't match",
    invalid: 'This reset link is invalid or has expired. Request a new one.',
    requestNew: 'Request a new link',
    doneTitle: 'Password changed',
    done: "You've been signed out everywhere. Sign in with your new password.",
    login: 'Sign in',
    tooMany: 'Too many attempts — try again later.',
    network: 'Network error',
    generic: 'Something went wrong',
  },
}

type Lang = keyof typeof STRINGS
const strings = (lang: string) => STRINGS[(lang in STRINGS ? lang : 'el') as Lang]

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, error: (data as { error?: string }).error }
}

export function ForgotPasswordForm({ lang }: { lang: string }) {
  const t = strings(lang)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const r = await post('/api/auth/forgot-password', { email, lang })
      if (r.ok) setSent(true)
      else setError(r.status === 429 ? t.tooMany : (r.error ?? t.generic))
    } catch {
      setError(t.network)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <Result icon={<MailCheck className="h-6 w-6" />} title={t.sentTitle} body={t.sent}>
        <Link href={`/${lang}/login`} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          {t.backToLogin}
        </Link>
      </Result>
    )
  }

  return (
    <div>
      <Header title={t.forgotTitle} sub={t.forgotSub} />
      <form onSubmit={submit} className="space-y-4">
        <Field label={t.email}>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="manager@axion.gr"
          />
        </Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? '…' : t.send}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href={`/${lang}/login`} className="font-semibold text-blue-600 hover:text-blue-700">
          {t.backToLogin}
        </Link>
      </p>
    </div>
  )
}

export function ResetPasswordForm({ lang, token }: { lang: string; token: string }) {
  const t = strings(lang)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'done' | 'invalid'>(token ? 'idle' : 'invalid')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) return setError(t.mismatch)
    setLoading(true)
    try {
      const r = await post('/api/auth/reset-password', { token, password })
      if (r.ok) setStatus('done')
      else if (r.status === 429) setError(t.tooMany)
      else if (r.status === 400 && r.error?.includes('reset link')) setStatus('invalid')
      else setError(r.error ?? t.generic)
    } catch {
      setError(t.network)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'done') {
    return (
      <Result icon={<CheckCircle2 className="h-6 w-6" />} title={t.doneTitle} body={t.done}>
        <Button href={`/${lang}/login`}>{t.login}</Button>
      </Result>
    )
  }

  if (status === 'invalid') {
    return (
      <div>
        <Header title={t.resetTitle} />
        <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">{t.invalid}</p>
        <p className="mt-6 text-center text-sm">
          <Link href={`/${lang}/forgot-password`} className="font-semibold text-blue-600 hover:text-blue-700">
            {t.requestNew}
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div>
      <Header title={t.resetTitle} sub={t.resetSub} />
      <form onSubmit={submit} className="space-y-4">
        <Field label={t.newPassword}>
          <input
            type="password"
            required
            minLength={8}
            maxLength={256}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            placeholder="••••••••"
          />
          <span className="mt-1 block text-xs text-slate-400">{t.minHint}</span>
        </Field>
        <Field label={t.confirm}>
          <input
            type="password"
            required
            minLength={8}
            maxLength={256}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputCls}
            placeholder="••••••••"
          />
        </Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? '…' : t.save}
        </Button>
      </form>
    </div>
  )
}

function Header({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-7 text-center">
      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
        A
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
    </div>
  )
}

function Result({ icon, title, body, children }: { icon: React.ReactNode; title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        {icon}
      </span>
      <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{body}</p>
      <div className="mt-6">{children}</div>
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
