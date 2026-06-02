'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './ui'

// Login form. Render inside a Card (page) or AuthModal (popup). Self-service
// signup is intentionally disabled — Axion accounts are provisioned by the operator.
export function AuthForm({ lang }: { lang: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Σύνδεση</h1>
        <p className="mt-1 text-sm text-slate-500">Πίνακας παραγωγικότητας — Axion</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="manager@axion.gr" />
        </Field>
        <Field label="Κωδικός">
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
        </Field>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? '…' : 'Σύνδεση'}
        </Button>
      </form>
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
