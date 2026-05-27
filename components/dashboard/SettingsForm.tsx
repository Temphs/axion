'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/axion/ui'
import { api } from '@/components/dashboard/api'

type Settings = {
  hoursPerDay: number
  daysPerMonth: number
  includeOverhead: boolean
}

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter()
  const [hoursPerDay, setHoursPerDay] = useState(String(initial.hoursPerDay))
  const [daysPerMonth, setDaysPerMonth] = useState(String(initial.daysPerMonth))
  const [includeOverhead, setIncludeOverhead] = useState(initial.includeOverhead)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const hpm = (Number(hoursPerDay) || 0) * (Number(daysPerMonth) || 0)

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    setSaving(true); setError(null); setSaved(false)
    const r = await api('PATCH', '/api/settings', {
      hoursPerDay: Number(hoursPerDay),
      daysPerMonth: Number(daysPerMonth),
      includeOverhead,
    })
    setSaving(false)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    setSaved(true)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-white">Ρυθμίσεις</h1>
        <p className="text-sm text-blue-200/90">Παράμετροι υπολογισμού κόστους & αξιοποίησης</p>
      </header>

      <Card className="max-w-xl p-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ώρες / ημέρα">
              <input type="number" min="1" step="0.5" className={inputCls} value={hoursPerDay} onChange={(e) => setHoursPerDay(e.target.value)} />
            </Field>
            <Field label="Ημέρες / μήνα">
              <input type="number" min="1" step="1" className={inputCls} value={daysPerMonth} onChange={(e) => setDaysPerMonth(e.target.value)} />
            </Field>
          </div>

          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Ώρες / μήνα: <span className="font-semibold text-slate-900">{hpm}</span> — χρησιμοποιείται για κόστος/ώρα και αξιοποίηση
          </p>

          <label className="flex items-start gap-2.5 text-sm text-slate-700">
            <input type="checkbox" checked={includeOverhead} onChange={(e) => setIncludeOverhead(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
            <span>
              Συμπερίληψη overhead στα σύνολα
              <span className="mt-0.5 block text-xs text-slate-400">
                Όταν είναι ανενεργό, οι μη χρεώσιμοι πελάτες εξαιρούνται από τα συνολικά κόστη/έσοδα της επισκόπησης.
              </span>
            </span>
          </label>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="h-[42px] rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
              Αποθήκευση
            </button>
            {saved && <span className="text-sm text-emerald-600">Αποθηκεύτηκε ✓</span>}
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </form>
      </Card>
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}
