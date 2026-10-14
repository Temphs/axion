'use client'

import { useState } from 'react'
import { Check, Copy, Link2, Loader2, Smartphone } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { api } from '@/components/dashboard/api'

// The owner's side of the entry terminal: create a personal link, copy it into
// a message, revoke it when the phone or the person changes.
export function EmployeeAccessLink({
  lang,
  employeeId,
  employeeName,
  token,
}: {
  lang: string
  employeeId: string
  employeeName: string
  token: string | null
}) {
  const [current, setCurrent] = useState(token)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Built in the browser so the link is always the host the owner is actually
  // using — localhost in development, the real domain in production.
  const url = current && typeof window !== 'undefined' ? `${window.location.origin}/${lang}/t/${current}` : ''

  async function create() {
    setBusy(true)
    setError(null)
    const r = await api('POST', `/api/employees/${employeeId}/access-link`)
    setBusy(false)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    setCurrent(r.data.accessToken)
  }

  async function revoke() {
    if (!confirm(`Ανάκληση συνδέσμου για ${employeeName}; Η οθόνη καταχώρησης θα σταματήσει αμέσως να λειτουργεί.`)) return
    setBusy(true)
    setError(null)
    const r = await api('DELETE', `/api/employees/${employeeId}/access-link`)
    setBusy(false)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    setCurrent(null)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Η αντιγραφή απέτυχε — επιλέξτε τον σύνδεσμο χειροκίνητα')
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-2.5">
        <Smartphone size={16} className="mt-0.5 shrink-0 text-blue-600" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">Οθόνη καταχώρησης</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Προσωπικός σύνδεσμος για τον/την {employeeName} — ανοίγει στο κινητό χωρίς κωδικό και καταχωρεί ώρες
            μόνο στο δικό του όνομα.
          </p>

          {current ? (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                  {url}
                </code>
                <button
                  onClick={copy}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Αντιγράφηκε' : 'Αντιγραφή'}
                </button>
              </div>
              <button
                onClick={revoke}
                disabled={busy}
                className="mt-2 text-xs font-medium text-red-500 transition hover:underline disabled:opacity-50"
              >
                Ανάκληση συνδέσμου
              </button>
            </>
          ) : (
            <button
              onClick={create}
              disabled={busy}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
              Δημιουργία συνδέσμου
            </button>
          )}

          {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </Card>
  )
}
