'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './ui'

// Inner login/signup form. Render inside a Card (page) or AuthModal (popup).
export function AuthForm({ lang }: { lang: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/signup'
      const body = mode === 'login' ? { email, password } : { email, password, name }
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Κάτι πήγε στραβά')
        return
      }
      router.push(`/${lang}/dashboard`)
      router.refresh()
    } catch {
      setError('Σφάλμα δικτύου')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-7 text-center">
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
          A
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {mode === 'login' ? 'Σύνδεση' : 'Δημιουργία λογαριασμού'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Πίνακας παραγωγικότητας — Axion</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === 'signup' && (
          <Field label="Ονοματεπώνυμο">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Διαχειριστής" />
          </Field>
        )}
        <Field label="Email">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="manager@axion.gr" />
        </Field>
        <Field label="Κωδικός">
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
          {mode === 'signup' && <span className="mt-1 block text-xs text-slate-400">Τουλάχιστον 8 χαρακτήρες</span>}
        </Field>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? '…' : mode === 'login' ? 'Σύνδεση' : 'Εγγραφή'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {mode === 'login' ? 'Δεν έχετε λογαριασμό;' : 'Έχετε ήδη λογαριασμό;'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setError(null)
          }}
          className="font-semibold text-blue-600 hover:text-blue-700"
        >
          {mode === 'login' ? 'Εγγραφή' : 'Σύνδεση'}
        </button>
      </p>
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
