'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/axion/ui'
import { api } from '@/components/dashboard/api'
import { shortDate } from '@/lib/format'

type Key = {
  id: string
  name: string
  prefix: string
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

export function ApiKeysManager({ initial }: { initial: Key[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function create(ev: React.FormEvent) {
    ev.preventDefault()
    setSaving(true); setError(null); setNewToken(null)
    const r = await api('POST', '/api/api-keys', { name })
    setSaving(false)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    setNewToken(r.data.token)
    setName('')
    router.refresh()
  }

  // Revoking stops the companion time-tracking app from posting hours, and the
  // token can't be recovered — so confirm before pulling it.
  async function revoke(k: Key) {
    if (!confirm(`Ανάκληση του κλειδιού «${k.name}»; Η εφαρμογή που το χρησιμοποιεί θα σταματήσει να στέλνει ώρες.`)) return
    const r = await api('DELETE', `/api/api-keys/${k.id}`)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    router.refresh()
  }

  async function copy() {
    if (!newToken) return
    await navigator.clipboard.writeText(newToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-white">API Keys</h1>
        <p className="text-sm text-blue-200/90">
          Διαπιστευτήρια για την εφαρμογή καταγραφής χρόνου. Στείλτε το header{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">Authorization: Bearer …</code>
        </p>
      </header>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Νέο κλειδί</h2>
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <label className="block flex-1">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Ονομασία</span>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required placeholder="time-tracker-app" />
          </label>
          <button type="submit" disabled={saving} className="h-[42px] rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
            Δημιουργία
          </button>
        </form>

        {newToken && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-800">Αντιγράψτε το τώρα — δεν θα εμφανιστεί ξανά.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-lg bg-white px-3 py-2 text-xs text-slate-800">{newToken}</code>
              <button onClick={copy} className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500">
                {copied ? 'Αντιγράφηκε' : 'Αντιγραφή'}
              </button>
            </div>
          </div>
        )}
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Ονομασία</th>
                <th className="px-5 py-3 font-medium">Κλειδί</th>
                <th className="px-5 py-3 font-medium">Τελευταία χρήση</th>
                <th className="px-5 py-3 text-center font-medium">Κατάσταση</th>
                <th className="px-5 py-3 text-right font-medium">Ενέργειες</th>
              </tr>
            </thead>
            <tbody>
              {initial.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Κανένα κλειδί ακόμη</td></tr>
              )}
              {initial.map((k) => (
                <tr key={k.id} className="border-t border-slate-50">
                  <td className="px-5 py-3 text-slate-800">{k.name}</td>
                  <td className="px-5 py-3"><code className="text-xs text-slate-500">{k.prefix}…</code></td>
                  <td className="px-5 py-3 text-slate-500">{k.lastUsedAt ? shortDate(k.lastUsedAt) : '—'}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={'rounded-full px-2.5 py-0.5 text-xs font-medium ' + (k.revokedAt ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600')}>
                      {k.revokedAt ? 'Ανακλήθηκε' : 'Ενεργό'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {!k.revokedAt && <button onClick={() => revoke(k)} className="text-red-500 hover:underline">Ανάκληση</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'
