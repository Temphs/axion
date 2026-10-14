'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Info,
  Loader2,
  RefreshCw,
  Wrench,
} from 'lucide-react'
import type { Alert, Severity } from '@/lib/admin/health'
import type { FixStatus } from '@/lib/admin/fixes'
import type { Analytics, Ranked } from '@/lib/admin/analytics'
import { TrafficChart } from './TrafficChart'

export type ErrorRow = {
  id: string
  source: string
  kind: string | null
  route: string | null
  message: string
  stack: string | null
  count: number
  status: string
  firstSeenAt: string
  lastSeenAt: string
  userEmail: string | null
}

const num = new Intl.NumberFormat('en-GB')

function ago(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.round(h / 24)} days ago`
}

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data }
}

export function AdminConsole({
  lang,
  adminEmail,
  generatedAt,
  alerts,
  fixes,
  errors,
  analytics,
}: {
  lang: string
  adminEmail: string
  generatedAt: string
  alerts: Alert[]
  fixes: FixStatus[]
  errors: ErrorRow[] | null
  analytics: Analytics
}) {
  const router = useRouter()
  const [refreshing, startRefresh] = useTransition()
  const refresh = () => startRefresh(() => router.refresh())
  const now = new Date(generatedAt).getTime()

  const openErrors = errors?.filter((e) => e.status === 'open').length ?? 0
  const critical = alerts.filter((a) => a.severity === 'critical').length
  const warnings = alerts.filter((a) => a.severity === 'warning').length
  const status: { tone: Severity | 'ok'; text: string } =
    critical > 0
      ? { tone: 'critical', text: critical === 1 ? '1 critical issue needs you' : `${critical} critical issues need you` }
      : warnings > 0
        ? { tone: 'warning', text: `${warnings} warning${warnings === 1 ? '' : 's'} to look at` }
        : { tone: 'ok', text: 'All systems normal' }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* ── Header ─────────────────────────────────────────── */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">A</span>
            <div>
              <h1 className="text-lg font-bold leading-tight">Axion Admin</h1>
              <p className="text-xs text-slate-500">{adminEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${lang}/dashboard`}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-white"
            >
              <ArrowLeft size={15} /> Dashboard
            </Link>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </header>

        <StatusBar tone={status.tone} text={status.text} generatedAt={generatedAt} />

        {/* ── Headline numbers ───────────────────────────────── */}
        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat
            label="Page views · 7 days"
            value={analytics.traffic.available ? num.format(analytics.traffic.last7) : '—'}
            delta={analytics.traffic.available ? delta(analytics.traffic.last7, analytics.traffic.prev7) : null}
          />
          <Stat label="Accounts" value={num.format(analytics.product.accounts)} sub={`+${analytics.product.signups7} this week`} />
          <Stat label="Active accounts · 7 days" value={num.format(analytics.product.activeAccounts7)} sub="logged hours this week" />
          <Stat label="Entries · 7 days" value={num.format(analytics.product.entries7)} />
          <Stat
            label="Open errors"
            value={errors ? num.format(openErrors) : '—'}
            sub={errors ? (openErrors ? 'see the list below' : 'nothing open') : 'log not set up yet'}
          />
        </section>

        {/* ── Needs you ─────────────────────────────────────── */}
        <Section title="Needs your attention" hint="Problems the app can't fix by itself, with what to do.">
          {alerts.length === 0 ? (
            <Empty text="Nothing needs you right now." />
          ) : (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <AlertRow key={a.id} alert={a} fix={a.fixId ? fixes.find((f) => f.id === a.fixId) : undefined} onDone={refresh} />
              ))}
            </ul>
          )}
        </Section>

        {/* ── Easy fixes ────────────────────────────────────── */}
        <Section title="Easy fixes" hint="Safe, one-click cleanups. They never change customers' employees, clients or hours.">
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {fixes.map((f) => (
              <FixRow key={f.id} fix={f} onDone={refresh} />
            ))}
          </ul>
        </Section>

        {/* ── Errors ────────────────────────────────────────── */}
        <Section title="Errors" hint="Grouped: the same error from many users is one row. A resolved error reopens if it happens again.">
          {errors === null ? (
            <Empty text='The error log is not set up yet. Run "Apply missing database changes" above.' />
          ) : (
            <ErrorList errors={errors} now={now} onChange={refresh} />
          )}
        </Section>

        {/* ── Analytics ─────────────────────────────────────── */}
        <Section title="Analytics" hint="Cookieless: no cookies, IP addresses or visitor IDs are stored, only daily totals.">
          <AnalyticsPanel analytics={analytics} />
        </Section>

        <p className="mt-8 text-center text-xs text-slate-400">Updated {new Date(generatedAt).toLocaleString('en-GB')}</p>
      </div>
    </div>
  )
}

/* ─── header pieces ─────────────────────────────────────────── */

const TONE = {
  ok: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-800', Icon: CheckCircle2, label: 'OK' },
  info: { cls: 'border-sky-200 bg-sky-50 text-sky-800', Icon: Info, label: 'Info' },
  warning: { cls: 'border-amber-200 bg-amber-50 text-amber-900', Icon: AlertTriangle, label: 'Warning' },
  critical: { cls: 'border-red-200 bg-red-50 text-red-800', Icon: AlertOctagon, label: 'Critical' },
} as const

function StatusBar({ tone, text, generatedAt }: { tone: Severity | 'ok'; text: string; generatedAt: string }) {
  const t = TONE[tone]
  return (
    <div className={`mt-5 flex items-center gap-2.5 rounded-xl border px-4 py-3 ${t.cls}`}>
      <t.Icon size={18} className="shrink-0" />
      <p className="text-sm font-semibold">{text}</p>
      <span className="ml-auto hidden text-xs opacity-70 sm:inline">
        checked {new Date(generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}

function delta(current: number, previous: number): { text: string; good: boolean } | null {
  if (previous <= 0) return null
  const pct = ((current - previous) / previous) * 100
  return { text: `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(0)}% vs previous 7 days`, good: pct >= 0 }
}

function Stat({ label, value, sub, delta: d }: { label: string; value: string; sub?: string; delta?: { text: string; good: boolean } | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {d ? (
        <p className={`mt-0.5 text-xs font-medium ${d.good ? 'text-emerald-700' : 'text-red-600'}`}>{d.text}</p>
      ) : (
        sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
      )}
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-bold">{title}</h2>
      <p className="mb-3 text-xs text-slate-500">{hint}</p>
      {children}
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">{text}</p>
}

/* ─── alerts and fixes ──────────────────────────────────────── */

function useRun(onDone: () => void) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  async function run(fixId: string) {
    setBusy(true)
    setResult(null)
    const r = await call('POST', `/api/admin/fixes/${fixId}`)
    setBusy(false)
    setResult({ ok: r.ok, text: r.ok ? r.data.message : (r.data.error ?? 'The fix failed') })
    if (r.ok) onDone()
  }
  return { busy, result, run }
}

function AlertRow({ alert, fix, onDone }: { alert: Alert; fix?: FixStatus; onDone: () => void }) {
  const t = TONE[alert.severity]
  const { busy, result, run } = useRun(onDone)
  return (
    <li className={`rounded-xl border px-4 py-3 ${t.cls}`}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <t.Icon size={17} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            <span className="mr-1.5 rounded bg-white/70 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide">{t.label}</span>
            {alert.title}
          </p>
          <p className="mt-0.5 break-words text-xs opacity-80">{alert.detail}</p>
          {alert.steps && (
            <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-xs opacity-90">
              {alert.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          )}
          {result && <p className={`mt-2 text-xs font-medium ${result.ok ? 'text-emerald-800' : 'text-red-700'}`}>{result.text}</p>}
        </div>
        {fix && (
          <button
            onClick={() => run(fix.id)}
            disabled={busy}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Wrench size={13} />} Fix it
          </button>
        )}
      </div>
    </li>
  )
}

function FixRow({ fix, onDone }: { fix: FixStatus; onDone: () => void }) {
  const { busy, result, run } = useRun(onDone)
  const nothing = fix.pending === 0
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      {/* Full width on phones, so the badge and button drop below the text. */}
      <div className="min-w-0 flex-1 basis-full sm:basis-0">
        <p className="text-sm font-semibold">{fix.title}</p>
        <p className="text-xs text-slate-500">{fix.description}</p>
        {result && <p className={`mt-1 text-xs font-medium ${result.ok ? 'text-emerald-700' : 'text-red-600'}`}>{result.text}</p>}
      </div>
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          fix.pending === null ? 'bg-slate-100 text-slate-500' : nothing ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
        }`}
      >
        {fix.pending === null ? 'unavailable' : nothing ? 'nothing to do' : `${num.format(fix.pending)} to fix`}
      </span>
      <button
        onClick={() => run(fix.id)}
        disabled={busy || nothing || (fix.pending === null && fix.id !== 'schema')}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Wrench size={13} />} Run
      </button>
    </li>
  )
}

/* ─── errors ────────────────────────────────────────────────── */

const FILTERS = ['open', 'ignored', 'resolved', 'all'] as const

function ErrorList({ errors, now, onChange }: { errors: ErrorRow[]; now: number; onChange: () => void }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('open')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const shown = useMemo(() => (filter === 'all' ? errors : errors.filter((e) => e.status === filter)), [errors, filter])

  async function setStatus(id: string, status: string) {
    setBusyId(id)
    await call('PATCH', `/api/admin/errors/${id}`, { status })
    setBusyId(null)
    onChange()
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex gap-1 border-b border-slate-100 p-2">
        {FILTERS.map((f) => {
          const n = f === 'all' ? errors.length : errors.filter((e) => e.status === f).length
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${
                filter === f ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f} <span className="opacity-60">{n}</span>
            </button>
          )
        })}
      </div>
      {shown.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">
          {filter === 'open' ? 'No open errors. 🎉' : 'Nothing here.'}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {shown.map((e) => {
            const open = expanded === e.id
            return (
              <li key={e.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                  <button onClick={() => setExpanded(open ? null : e.id)} className="min-w-0 flex-1 text-left">
                    <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      <span className={`rounded px-1.5 py-px font-semibold ${e.source === 'server' ? 'bg-violet-50 text-violet-700' : 'bg-sky-50 text-sky-700'}`}>
                        {e.source}
                        {e.kind ? ` · ${e.kind}` : ''}
                      </span>
                      {e.route && <span className="font-mono">{e.route}</span>}
                      <span>· {ago(e.lastSeenAt, now)}</span>
                      {e.userEmail && <span>· {e.userEmail}</span>}
                    </p>
                    <p className={`mt-1 text-sm font-medium text-slate-800 ${open ? 'break-words' : 'line-clamp-2'}`}>{e.message}</p>
                  </button>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-700">
                    {num.format(e.count)}×
                  </span>
                  <div className="flex shrink-0 gap-1">
                    {e.status !== 'resolved' && (
                      <ActionButton busy={busyId === e.id} onClick={() => setStatus(e.id, 'resolved')}>
                        Resolve
                      </ActionButton>
                    )}
                    {e.status === 'open' && (
                      <ActionButton busy={busyId === e.id} onClick={() => setStatus(e.id, 'ignored')}>
                        Ignore
                      </ActionButton>
                    )}
                    {e.status !== 'open' && (
                      <ActionButton busy={busyId === e.id} onClick={() => setStatus(e.id, 'open')}>
                        Reopen
                      </ActionButton>
                    )}
                    <button
                      onClick={() => setExpanded(open ? null : e.id)}
                      aria-label={open ? 'Hide details' : 'Show details'}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                    >
                      <ChevronDown size={15} className={open ? 'rotate-180' : ''} />
                    </button>
                  </div>
                </div>
                {open && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-slate-500">
                      First seen {new Date(e.firstSeenAt).toLocaleString('en-GB')} · last seen{' '}
                      {new Date(e.lastSeenAt).toLocaleString('en-GB')} · status {e.status}
                    </p>
                    {e.stack ? (
                      <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">{e.stack}</pre>
                    ) : (
                      <p className="text-xs text-slate-400">No stack trace recorded.</p>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ActionButton({ busy, onClick, children }: { busy: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
    >
      {children}
    </button>
  )
}

/* ─── analytics ─────────────────────────────────────────────── */

function AnalyticsPanel({ analytics }: { analytics: Analytics }) {
  const { traffic, product } = analytics
  const deviceTotal = traffic.devices.reduce((s, d) => s + d.value, 0)
  const pct = (v: number) => (deviceTotal ? `${Math.round((v / deviceTotal) * 100)}%` : '—')
  const mobile = traffic.devices.find((d) => d.label === 'mobile')?.value ?? 0

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Page views per day · last 30 days</h3>
          <p className="text-xs text-slate-500">
            {traffic.available
              ? `${num.format(traffic.today)} today · ${num.format(traffic.last30)} in 30 days · ${pct(mobile)} on mobile`
              : 'Not set up yet'}
          </p>
        </div>
        {traffic.available ? (
          <TrafficChart days={traffic.days} />
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">Run &ldquo;Apply missing database changes&rdquo; to start counting.</p>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <RankedList title="Top pages" rows={traffic.topPages} mono />
        <RankedList title="Where visitors came from" rows={traffic.referrers} empty="Direct visits only so far" />
        <RankedList title="Countries" rows={traffic.countries} empty="Shown once deployed on Vercel" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold">Product usage · last 7 days</h3>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Logins" value={product.logins7} />
          <Metric label="Failed logins" value={product.failedLogins7} />
          <Metric label="Password resets asked" value={product.resetRequests7} />
          <Metric label="Hours entered by phone link" value={product.terminalEntries7} />
          <Metric label="Entries via API" value={product.apiEntries7} />
          <Metric label="Active entry links" value={product.activeLinks} />
        </dl>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-lg font-bold">{value === null ? '—' : num.format(value)}</dd>
    </div>
  )
}

function RankedList({ title, rows, mono, empty = 'No data yet' }: { title: string; rows: Ranked[]; mono?: boolean; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className={`truncate text-slate-700 ${mono ? 'font-mono' : ''}`} title={r.label}>
                  {r.label}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-slate-900">{num.format(r.value)}</span>
              </div>
              <div className="mt-0.5 h-1.5 rounded-full bg-slate-100">
                <div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
