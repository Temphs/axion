'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, Plus, Clock, CalendarDays } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { ProgressBar } from '@/components/axion/charts'
import { api } from '@/components/dashboard/api'
import { eur, hrs, pct } from '@/lib/format'

type EmployeeOverview = {
  id: string
  name: string
  notes: string | null
  active: boolean
  monthlyCost: number
  costPerHour: number
  hours: number
  avgPerDay: number
  avgPerMonth: number
  utilization: number | null
  billablePct: number | null
  cost: number
}

function utilColor(u: number | null): string {
  if (u === null) return '#94a3b8'
  if (u >= 0.8) return '#10b981'
  if (u >= 0.5) return '#2563EB'
  return '#f59e0b'
}

export function EmployeesGrid({
  lang,
  employees,
  hoursPerMonth,
}: {
  lang: string
  employees: EmployeeOverview[]
  hoursPerMonth: number
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [monthlyCost, setMonthlyCost] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const r = await api('POST', '/api/employees', { name, monthlyCost: Number(monthlyCost) || 0, notes })
    setSaving(false)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    setName(''); setMonthlyCost(''); setNotes(''); setAdding(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Εργαζόμενοι</h1>
          <p className="text-sm text-slate-500">Επιλέξτε εργαζόμενο για αναλυτικά στοιχεία παραγωγικότητας</p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
        >
          <Plus size={16} /> Νέος εργαζόμενος
        </button>
      </header>

      {adding && (
        <Card className="p-5">
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_180px_1fr_auto] sm:items-end">
            <Field label="Όνομα">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required placeholder="Δημήτρης" />
            </Field>
            <Field label="Μηνιαίο κόστος (€)">
              <input className={inputCls} type="number" min="0" step="0.01" value={monthlyCost} onChange={(e) => setMonthlyCost(e.target.value)} placeholder="1600" />
            </Field>
            <Field label="Σημειώσεις / Ρόλος">
              <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Λογιστής" />
            </Field>
            <button type="submit" disabled={saving} className="h-[42px] rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
              {saving ? '…' : 'Προσθήκη'}
            </button>
          </form>
          {monthlyCost && Number(monthlyCost) > 0 && hoursPerMonth > 0 && (
            <p className="mt-2 text-xs text-slate-500">≈ {eur(Number(monthlyCost) / hoursPerMonth, true)} / ώρα</p>
          )}
          {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </Card>
      )}

      {employees.length === 0 ? (
        <Card className="p-10 text-center text-slate-500">Κανένας εργαζόμενος ακόμη — προσθέστε τον πρώτο.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {employees.map((e) => (
            <Link key={e.id} href={`/${lang}/dashboard/employees/${e.id}`} className="group">
              <Card className="h-full p-5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_32px_-12px_rgba(37,99,235,0.35)]">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 text-lg font-bold text-white">
                    {e.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{e.name}</p>
                    <p className="truncate text-xs text-slate-400">{e.notes || 'Εργαζόμενος'}</p>
                  </div>
                  <ArrowUpRight size={18} className="shrink-0 text-slate-300 transition group-hover:text-blue-500" />
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3">
                  <Metric icon={<Clock size={14} />} label="Ώρες / ημέρα" value={hrs(e.avgPerDay)} />
                  <Metric icon={<CalendarDays size={14} />} label="Ώρες / μήνα" value={hrs(e.avgPerMonth)} />
                </div>

                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Αξιοποίηση μήνα</span>
                    <span className="font-semibold text-slate-700">{pct(e.utilization)}</span>
                  </div>
                  <ProgressBar value={Math.min(100, (e.utilization ?? 0) * 100)} color={utilColor(e.utilization)} />
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span>Χρεώσιμες: <span className="font-medium text-slate-700">{pct(e.billablePct)}</span></span>
                  <span>{eur(e.costPerHour, true)}/ώρα</span>
                </div>
                {!e.active && (
                  <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Ανενεργός</span>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
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

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-slate-400">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold tracking-tight text-slate-900">{value}</p>
    </div>
  )
}
