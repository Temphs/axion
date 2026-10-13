'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from './ui'
import { PasswordInput } from './PasswordInput'

// Login / signup form. Render inside a Card (page) or AuthModal (popup).
// Each signup gets its own isolated workspace, so open registration is safe.
export function AuthForm({ lang }: { lang: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<{ message: string; badCredentials?: boolean } | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    // Read what is actually in the fields: a password manager or browser
    // autofill can fill them without React seeing a change event, and then
    // the component state would send an empty or stale password.
    const form = new FormData(e.currentTarget)
    const fields = {
      email: String(form.get('email') ?? email),
      password: String(form.get('password') ?? password),
      name: String(form.get('name') ?? name),
    }
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/signup'
      const body =
        mode === 'login'
          ? { email: fields.email, password: fields.password }
          : { email: fields.email, password: fields.password, name: fields.name }
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 429) setError({ message: 'Πολλές προσπάθειες — δοκιμάστε ξανά σε λίγα λεπτά.' })
        else if (mode === 'login' && res.status === 401) setError({ message: 'Λάθος email ή κωδικός.', badCredentials: true })
        else setError({ message: data.error ?? 'Κάτι πήγε στραβά' })
        return
      }
      router.push(`/${lang}/dashboard`)
      router.refresh()
    } catch {
      setError({ message: 'Σφάλμα δικτύου' })
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
            <input
              type="text"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Διαχειριστής"
            />
          </Field>
        )}
        <Field label="Email">
          <input
            type="email"
            name="email"
            required
            autoComplete={mode === 'login' ? 'username' : 'email'}
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="manager@axion.gr"
          />
        </Field>
        <Field label="Κωδικός">
          <PasswordInput
            key={mode}
            name="password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={mode === 'signup' ? 8 : undefined}
            className={inputCls}
          />
          {mode === 'signup' && <span className="mt-1 block text-xs text-slate-400">Τουλάχιστον 8 χαρακτήρες</span>}
          {mode === 'login' && (
            <Link
              href={`/${lang}/forgot-password`}
              className="mt-1.5 inline-block text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Ξεχάσατε τον κωδικό;
            </Link>
          )}
        </Field>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            <p>{error.message}</p>
            {error.badCredentials && (
              <p className="mt-1 text-xs text-red-500/90">
                Ελέγξτε ότι το πληκτρολόγιο είναι στα αγγλικά και ότι το Caps Lock είναι ανενεργό (πατήστε το εικονίδιο
                του ματιού για να δείτε τι πληκτρολογήσατε).{' '}
                <Link href={`/${lang}/forgot-password`} className="font-semibold underline">
                  Επαναφορά κωδικού
                </Link>
              </p>
            )}
          </div>
        )}

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
