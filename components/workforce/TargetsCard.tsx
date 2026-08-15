'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Target } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { api } from '@/components/dashboard/api'
import { eur, hrs, pct } from '@/lib/format'

export type TargetsCardProps = {
  employeeId: string
  targets: { utilizationPct: number | null; monthlyHours: number | null; monthlyContribution: number | null }
  // Period actuals normalized per month so they compare against monthly targets.
  actuals: { utilization: number | null; monthlyHours: number; monthlyContribution: number }
}

// Targets vs actuals with inline editing. Persisted on the Employee record.
export function TargetsCard({ employeeId, targets, actuals }: TargetsCardProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [utilization, setUtilization] = useState(targets.utilizationPct?.toString() ?? '')
  const [hours, setHours] = useState(targets.monthlyHours?.toString() ?? '')
  const [contribution, setContribution] = useState(targets.monthlyContribution?.toString() ?? '')

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const parse = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')))
    const r = await api('PATCH', `/api/employees/${employeeId}`, {
      targetUtilizationPct: parse(utilization),
      targetMonthlyHours: parse(hours),
      targetMonthlyContribution: parse(contribution),
    })
    setSaving(false)
    if (!r.ok) {
      setError(r.data?.error ?? 'Η αποθήκευση απέτυχε')
      return
    }
    setEditing(false)
    router.refresh()
  }

  const rows: Array<{ label: string; target: string | null; actual: string; progress: number | null }> = [
    {
      label: 'Αξιοποίηση',
      target: targets.utilizationPct != null ? `${targets.utilizationPct}%` : null,
      actual: pct(actuals.utilization),
      progress:
        targets.utilizationPct != null && actuals.utilization !== null
          ? actuals.utilization / (targets.utilizationPct / 100)
          : null,
    },
    {
      label: 'Ώρες / μήνα',
      target: targets.monthlyHours != null ? hrs(targets.monthlyHours) : null,
      actual: hrs(actuals.monthlyHours),
      progress: targets.monthlyHours != null && targets.monthlyHours > 0 ? actuals.monthlyHours / targets.monthlyHours : null,
    },
    {
      label: 'Συνεισφορά / μήνα',
      target: targets.monthlyContribution != null ? eur(targets.monthlyContribution) : null,
      actual: eur(actuals.monthlyContribution),
      progress:
        targets.monthlyContribution != null && targets.monthlyContribution > 0
          ? actuals.monthlyContribution / targets.monthlyContribution
          : null,
    },
  ]

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={15} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-900">Στόχοι</h2>
        </div>
        <button
          onClick={() => setEditing((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
        >
          <Pencil size={12} /> {editing ? 'Άκυρο' : 'Επεξεργασία'}
        </button>
      </div>

      {editing ? (
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-slate-600">
            Στόχος αξιοποίησης (%)
            <input
              value={utilization}
              onChange={(e) => setUtilization(e.target.value)}
              inputMode="decimal"
              placeholder="π.χ. 75"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>
          <label className="text-xs text-slate-600">
            Στόχος ωρών / μήνα
            <input
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              inputMode="decimal"
              placeholder="π.χ. 160"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>
          <label className="text-xs text-slate-600">
            Στόχος συνεισφοράς / μήνα (€)
            <input
              value={contribution}
              onChange={(e) => setContribution(e.target.value)}
              inputMode="decimal"
              placeholder="π.χ. 4000"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>
          <div className="flex items-center gap-3 sm:col-span-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? 'Αποθήκευση…' : 'Αποθήκευση'}
            </button>
            <span className="text-[11px] text-slate-400">Αφήστε κενό ένα πεδίο για να αφαιρέσετε τον στόχο.</span>
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
        </form>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {rows.map((r) => (
            <div key={r.label}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{r.label}</p>
              {r.target === null ? (
                <p className="mt-1 text-sm text-slate-400">Χωρίς στόχο</p>
              ) : (
                <>
                  <p className="mt-1 text-sm tabular-nums text-slate-700">
                    <span className="font-semibold text-slate-900">{r.actual}</span>
                    <span className="text-slate-400"> / {r.target}</span>
                    {r.progress !== null && (
                      <span className={`ml-2 text-xs font-semibold ${r.progress >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {r.progress >= 1 ? '+' : '−'}
                        {Math.abs((r.progress - 1) * 100).toFixed(1)}%
                      </span>
                    )}
                  </p>
                  {r.progress !== null && (
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${r.progress >= 1 ? 'bg-emerald-500' : r.progress >= 0.8 ? 'bg-blue-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(100, r.progress * 100)}%` }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
