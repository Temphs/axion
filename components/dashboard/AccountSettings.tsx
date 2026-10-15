'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, KeyRound, ShieldCheck, SlidersHorizontal, Trash2, UserRound, Users } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { api } from '@/components/dashboard/api'
import { eur, hrs, num } from '@/lib/format'
import { formatDate } from '@/lib/datetime'

type Account = {
  email: string
  name: string | null
  createdAt: string
  employeeCount: number
  clientCount: number
  entryCount: number
}

type CalcSettings = { hoursPerDay: number; daysPerMonth: number; includeOverhead: boolean }

type EmployeeContract = {
  id: string
  name: string
  active: boolean
  monthlyCost: number
  contractHoursPerMonth: number | null
}

export function AccountSettings({
  account,
  settings,
  employees,
}: {
  account: Account
  settings: CalcSettings
  employees: EmployeeContract[]
}) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Ρυθμίσεις</h1>
        <p className="mt-0.5 text-sm text-blue-200/80">Στοιχεία λογαριασμού, ασφάλεια και παράμετροι υπολογισμού</p>
      </header>

      <ProfileCard account={account} />
      <PasswordCard />
      <CalcCard settings={settings} />
      <ContractHoursCard employees={employees} defaultHours={settings.hoursPerDay * settings.daysPerMonth} />
      <PrivacyCard email={account.email} />
    </div>
  )
}

/* ─── profile ────────────────────────────────────────────────── */

function ProfileCard({ account }: { account: Account }) {
  const router = useRouter()
  const [name, setName] = useState(account.name ?? '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function save(ev: React.FormEvent) {
    ev.preventDefault()
    setBusy(true); setError(null); setMsg(null)
    const r = await api('PATCH', '/api/account', { name })
    setBusy(false)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    setMsg('Αποθηκεύτηκε')
    router.refresh()
  }

  return (
    <Section icon={<UserRound size={16} />} title="Στοιχεία λογαριασμού" sub="Το όνομα που εμφανίζεται στην εφαρμογή">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Όνομα">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="π.χ. Αρτέμιος" />
        </Field>
        <Field label="Email σύνδεσης">
          <input className={`${inputCls} bg-slate-50 text-slate-500`} value={account.email} readOnly />
        </Field>

        <div className="sm:col-span-2 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl bg-slate-50 px-3.5 py-3 text-xs text-slate-500">
          <span>Μέλος από <strong className="text-slate-700">{formatDate(account.createdAt)}</strong></span>
          <span>Εργαζόμενοι: <strong className="text-slate-700">{num(account.employeeCount)}</strong></span>
          <span>Πελάτες: <strong className="text-slate-700">{num(account.clientCount)}</strong></span>
          <span>Καταχωρήσεις: <strong className="text-slate-700">{num(account.entryCount)}</strong></span>
        </div>

        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={busy} className={primaryBtn}>Αποθήκευση</button>
          {msg && <span className="text-sm text-emerald-600">{msg} ✓</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>
    </Section>
  )
}

/* ─── password ───────────────────────────────────────────────── */

function PasswordCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    setError(null); setMsg(null)
    if (next !== confirm) return setError('Ο νέος κωδικός και η επιβεβαίωση δεν ταιριάζουν')
    setBusy(true)
    const r = await api('POST', '/api/account/password', { currentPassword: current, newPassword: next })
    setBusy(false)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    setCurrent(''); setNext(''); setConfirm('')
    setMsg('Ο κωδικός άλλαξε — οι υπόλοιπες συνδέσεις αποσυνδέθηκαν')
  }

  return (
    <Section icon={<KeyRound size={16} />} title="Αλλαγή κωδικού" sub="Τουλάχιστον 8 χαρακτήρες">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        <Field label="Τρέχων κωδικός">
          <input type="password" autoComplete="current-password" className={inputCls} value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </Field>
        <Field label="Νέος κωδικός">
          <input type="password" autoComplete="new-password" className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} />
        </Field>
        <Field label="Επιβεβαίωση">
          <input type="password" autoComplete="new-password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
        </Field>
        <div className="sm:col-span-3 flex items-center gap-3">
          <button type="submit" disabled={busy} className={primaryBtn}>Αλλαγή κωδικού</button>
          {msg && <span className="text-sm text-emerald-600">{msg}</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>
    </Section>
  )
}

/* ─── calculation parameters ─────────────────────────────────── */

function CalcCard({ settings }: { settings: CalcSettings }) {
  const router = useRouter()
  const [hoursPerDay, setHoursPerDay] = useState(String(settings.hoursPerDay))
  const [daysPerMonth, setDaysPerMonth] = useState(String(settings.daysPerMonth))
  const [includeOverhead, setIncludeOverhead] = useState(settings.includeOverhead)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hpm = (Number(hoursPerDay) || 0) * (Number(daysPerMonth) || 0)

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    setBusy(true); setError(null); setMsg(null)
    const r = await api('PATCH', '/api/settings', {
      hoursPerDay: Number(hoursPerDay),
      daysPerMonth: Number(daysPerMonth),
      includeOverhead,
    })
    setBusy(false)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    setMsg('Αποθηκεύτηκε')
    router.refresh()
  }

  return (
    <Section
      icon={<SlidersHorizontal size={16} />}
      title="Παράμετροι υπολογισμού"
      sub="Προεπιλογή για όσους εργαζόμενους δεν έχουν δικές τους συμβατικές ώρες"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ώρες / ημέρα">
            <input type="number" min="1" step="0.5" className={inputCls} value={hoursPerDay} onChange={(e) => setHoursPerDay(e.target.value)} />
          </Field>
          <Field label="Ημέρες / μήνα">
            <input type="number" min="1" step="1" className={inputCls} value={daysPerMonth} onChange={(e) => setDaysPerMonth(e.target.value)} />
          </Field>
        </div>

        <p className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
          Ώρες / μήνα: <span className="font-semibold text-slate-900">{hpm}</span> — βάση για κόστος/ώρα και αξιοποίηση
        </p>

        <label className="flex items-start gap-2.5 text-sm text-slate-700">
          <input type="checkbox" checked={includeOverhead} onChange={(e) => setIncludeOverhead(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
          <span>
            Συμπερίληψη overhead στα σύνολα
            <span className="mt-0.5 block text-xs text-slate-400">
              Όταν είναι ανενεργό, οι μη χρεώσιμοι πελάτες εξαιρούνται από τα συνολικά κόστη/έσοδα.
            </span>
          </span>
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy} className={primaryBtn}>Αποθήκευση</button>
          {msg && <span className="text-sm text-emerald-600">{msg} ✓</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>
    </Section>
  )
}

/* ─── per-employee contract hours ────────────────────────────── */

function ContractHoursCard({ employees, defaultHours }: { employees: EmployeeContract[]; defaultHours: number }) {
  return (
    <Section
      icon={<Users size={16} />}
      title="Συμβατικές ώρες ανά εργαζόμενο"
      sub={`Κενό = χρήση της προεπιλογής (${num(defaultHours)} ώρες/μήνα). Επηρεάζει αξιοποίηση και κόστος/ώρα.`}
    >
      {employees.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
          Δεν υπάρχουν εργαζόμενοι ακόμη.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {employees.map((e) => (
            <ContractRow key={e.id} employee={e} defaultHours={defaultHours} />
          ))}
        </div>
      )}
    </Section>
  )
}

function ContractRow({ employee, defaultHours }: { employee: EmployeeContract; defaultHours: number }) {
  const router = useRouter()
  const [value, setValue] = useState(employee.contractHoursPerMonth != null ? String(employee.contractHoursPerMonth) : '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effective = Number(value.replace(',', '.')) || defaultHours
  const costPerHour = effective > 0 ? employee.monthlyCost / effective : 0
  const dirty = (employee.contractHoursPerMonth != null ? String(employee.contractHoursPerMonth) : '') !== value

  async function save() {
    setBusy(true); setError(null); setSaved(false)
    const parsed = value.trim() === '' ? null : Number(value.replace(',', '.'))
    const r = await api('PATCH', `/api/employees/${employee.id}`, { contractHoursPerMonth: parsed })
    setBusy(false)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    setSaved(true)
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">
          {employee.name}
          {!employee.active && <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">ανενεργός</span>}
        </p>
        <p className="text-xs text-slate-400">
          {eur(employee.monthlyCost)}/μήνα · {hrs(effective)}/μήνα → <strong className="text-slate-600">{eur(costPerHour, true)}/ώρα</strong>
        </p>
      </div>
      <input
        type="number"
        min="1"
        step="1"
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false) }}
        placeholder={String(defaultHours)}
        aria-label={`Συμβατικές ώρες: ${employee.name}`}
        className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-right text-sm text-slate-900 outline-none focus:border-blue-400"
      />
      <button
        onClick={save}
        disabled={busy || !dirty}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
      >
        {busy ? '…' : 'Αποθήκευση'}
      </button>
      {saved && <span className="text-xs text-emerald-600">✓</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}

/* ─── data & privacy (GDPR export / erasure) ─────────────────── */

function PrivacyCard({ email }: { email: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function deleteAccount(ev: React.FormEvent) {
    ev.preventDefault()
    setError(null)
    const sure = confirm(
      `Οριστική διαγραφή του λογαριασμού ${email};\n\n` +
        'Διαγράφονται όλοι οι εργαζόμενοι, πελάτες, καταχωρήσεις, παραστατικά, API keys και ρυθμίσεις. ' +
        'Η ενέργεια δεν αναιρείται — κατεβάστε πρώτα τα δεδομένα σας αν τα χρειάζεστε.'
    )
    if (!sure) return
    setBusy(true)
    const r = await api('DELETE', '/api/account', { password })
    setBusy(false)
    if (!r.ok) {
      return setError(
        r.status === 403 ? 'Λάθος κωδικός' : r.status === 429 ? 'Πολλές προσπάθειες — δοκιμάστε αργότερα' : (r.data.error ?? 'Σφάλμα')
      )
    }
    router.push('/')
    router.refresh()
  }

  return (
    <Section icon={<ShieldCheck size={16} />} title="Δεδομένα & απόρρητο" sub="Εξαγωγή όλων των δεδομένων σας ή οριστική διαγραφή του λογαριασμού">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-3">
          <p className="text-sm text-slate-600">
            Όλα τα δεδομένα του λογαριασμού σε ένα αρχείο JSON (εργαζόμενοι, πελάτες, καταχωρήσεις, παραστατικά, ρυθμίσεις).
          </p>
          <a
            href="/api/account/export"
            download
            className="inline-flex h-[38px] shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download size={15} /> Λήψη δεδομένων
          </a>
        </div>

        <form onSubmit={deleteAccount} className="rounded-xl border border-red-100 bg-red-50/40 p-3.5">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <Trash2 size={15} /> Διαγραφή λογαριασμού
          </p>
          <p className="mt-1 text-xs text-red-600/80">
            Οριστική διαγραφή του λογαριασμού και όλων των δεδομένων του. Δεν αναιρείται.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="block min-w-[200px] flex-1">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Κωδικός (για επιβεβαίωση)</span>
              <input
                type="password"
                autoComplete="current-password"
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button
              type="submit"
              disabled={busy || !password}
              className="h-[42px] rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {busy ? '…' : 'Διαγραφή λογαριασμού'}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </form>
      </div>
    </Section>
  )
}

/* ─── shared bits ────────────────────────────────────────────── */

function Section({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">{icon}</span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
      </div>
      {children}
    </Card>
  )
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'

const primaryBtn =
  'h-[42px] rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}
