'use client'

import { useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  BarChart3,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowDownCircle,
  ArrowUpCircle,
  ShieldCheck,
  Info,
  Search,
  Settings2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { BarChart, Donut } from '@/components/axion/charts'
import { api } from '@/components/dashboard/api'
import { CATEGORY_LABELS, INVOICE_CATEGORIES, type InvoiceCategory } from '@/services/vat/categories'
import type { VatSummary } from '@/services/vat/queries'
import type { VatPrediction } from '@/services/vat/prediction'

/* ─── serialized API shapes (all money in cents) ─────────────── */

type InvoiceRow = {
  id: string
  aadeMark: string | null
  documentNumber: string | null
  direction: string
  issueDate: string
  counterparty: string
  netCents: number
  vatCents: number
  grossCents: number
  vatRateBps: number | null
  vatDeductible: boolean
  category: string
  manualCategory: string | null
  categoryConfidence: number | null
  categoryExplanation: string | null
  needsReview: boolean
  reviewReason: string | null
  description: string | null
  source: string
}

type InvoiceList = { total: number; page: number; pageSize: number; invoices: InvoiceRow[] }

/* ─── helpers ────────────────────────────────────────────────── */

const eurFmt = new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
const centsEur = (cents: number) => eurFmt.format(cents / 100)
const catLabel = (c: string) => CATEGORY_LABELS[c as InvoiceCategory]?.el ?? c

const DONUT_COLORS = ['#2563EB', '#7C3AED', '#0891B2', '#D97706', '#DC2626', '#059669', '#94A3B8']

const CONFIDENCE_STYLE: Record<VatPrediction['confidence'], { label: string; cls: string }> = {
  high: { label: 'Υψηλή βεβαιότητα', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  medium: { label: 'Μέτρια βεβαιότητα', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  low: { label: 'Χαμηλή βεβαιότητα', cls: 'bg-red-50 text-red-600 border-red-200' },
}

/* ─── main component ─────────────────────────────────────────── */

export function VatDashboard({
  basis,
  summary,
  prediction,
  invoiceList,
}: {
  basis: 'month' | 'quarter'
  summary: VatSummary
  prediction: VatPrediction
  invoiceList: InvoiceList
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [counterpartyInput, setCounterpartyInput] = useState(searchParams.get('counterparty') ?? '')

  const setParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }))
  }

  const refresh = () => startTransition(() => router.refresh())

  const runSync = async () => {
    setSyncing(true)
    setSyncMessage(null)
    setError(null)
    const r = await api('POST', '/api/vat/sync-aade', {})
    setSyncing(false)
    if (!r.ok) {
      setError(
        r.status === 409
          ? 'Δεν έχει ρυθμιστεί σύνδεση με το myDATA. Προσθέστε τα στοιχεία σύνδεσης στην ενότητα «Σύνδεση myDATA / ΑΑΔΕ» παρακάτω.'
          : r.status === 429
            ? 'Πολλές αιτήσεις συγχρονισμού — δοκιμάστε ξανά σε λίγο.'
            : `Ο συγχρονισμός απέτυχε${r.data?.errorCode ? ` (${r.data.errorCode})` : ''}. Ελέγξτε τα στοιχεία σύνδεσης και δοκιμάστε ξανά.`
      )
      return
    }
    setSyncMessage(
      `Ο συγχρονισμός ολοκληρώθηκε: ${r.data.fetched} παραστατικά, ${r.data.imported} νέα, ${r.data.duplicates} διπλότυπα αγνοήθηκαν.`
    )
    refresh()
  }

  const overrideCategory = async (invoice: InvoiceRow, value: string) => {
    const body = value === '__clear__' ? { category: null } : { category: value as InvoiceCategory }
    const r = await api('PATCH', `/api/vat/invoices/${invoice.id}/category`, body)
    if (r.ok) refresh()
    else setError(r.data?.error ?? 'Η αλλαγή κατηγορίας απέτυχε')
  }

  const net = summary.position.netVatCents
  const payable = net >= 0

  const donutSegments = useMemo(() => {
    const top = summary.categoryBreakdown.filter((c) => c.vatCents !== 0).slice(0, 6)
    return top.map((c, i) => ({ value: Math.abs(c.vatCents), color: DONUT_COLORS[i % DONUT_COLORS.length], ...c }))
  }, [summary])

  const totalPages = Math.max(1, Math.ceil(invoiceList.total / invoiceList.pageSize))

  return (
    <div className={`space-y-5 ${isPending ? 'opacity-70 transition-opacity' : ''}`}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-900/40">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">VAT Analysis</h1>
            <p className="mt-0.5 text-sm text-blue-200/80">Ανάλυση &amp; πρόβλεψη ΦΠΑ · myDATA / ΑΑΔΕ</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-xl border border-white/15 text-xs font-semibold">
            {(['quarter', 'month'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setParams({ basis: b === 'quarter' ? null : b, page: null })}
                className={`px-3 py-2 transition ${
                  basis === b ? 'bg-violet-600 text-white' : 'bg-white/10 text-blue-100/70 hover:bg-white/20'
                }`}
              >
                {b === 'quarter' ? 'Τρίμηνο' : 'Μήνας'}
              </button>
            ))}
          </div>

          <button
            onClick={runSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-violet-500 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Συγχρονισμός…' : 'Συγχρονισμός με ΑΑΔΕ'}
          </button>
        </div>
      </header>

      {/* sync status line */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-200/70">
        <span className="inline-flex items-center gap-1.5">
          {summary.sync.configured ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-amber-400" />
          )}
          {summary.sync.configured
            ? `Σύνδεση myDATA: ${
                summary.sync.environment === 'production'
                  ? 'παραγωγή'
                  : summary.sync.environment === 'mock'
                    ? 'demo δεδομένα'
                    : 'δοκιμαστικό περιβάλλον'
              }`
            : 'Δεν έχει ρυθμιστεί σύνδεση myDATA'}
        </span>
        {summary.sync.lastSyncedAt && (
          <span>Τελευταίος συγχρονισμός: {new Date(summary.sync.lastSyncedAt).toLocaleString('el-GR')}</span>
        )}
        {summary.sync.lastError && (
          <span className="inline-flex items-center gap-1 text-red-300">
            <AlertTriangle className="h-3.5 w-3.5" /> Τελευταίο σφάλμα συγχρονισμού: {summary.sync.lastError}
          </span>
        )}
      </div>

      {/* error / success banners */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100 backdrop-blur-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {syncMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100 backdrop-blur-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {syncMessage}
        </div>
      )}

      {/* ── Prediction hero ─────────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Πρόβλεψη ΦΠΑ περιόδου {prediction.period.label}</h2>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CONFIDENCE_STYLE[prediction.confidence].cls}`}>
                {CONFIDENCE_STYLE[prediction.confidence].label}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`font-display text-3xl font-bold tracking-tight ${
                  prediction.projectedNetVatCents.base >= 0 ? 'text-slate-900' : 'text-emerald-600'
                }`}
              >
                {centsEur(Math.abs(prediction.projectedNetVatCents.base))}
              </span>
              <span className="text-sm font-medium text-slate-500">
                {prediction.projectedNetVatCents.base >= 0 ? 'εκτιμώμενος πληρωτέος ΦΠΑ' : 'εκτιμώμενο πιστωτικό υπόλοιπο'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Εύρος: {centsEur(prediction.projectedNetVatCents.low)} – {centsEur(prediction.projectedNetVatCents.high)} · απομένουν{' '}
              {prediction.daysRemaining} ημέρες στην περίοδο
            </p>
            {prediction.varianceFromPreviousCents != null && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                {prediction.varianceFromPreviousCents >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
                )}
                {prediction.varianceFromPreviousCents >= 0 ? '+' : '−'}
                {centsEur(Math.abs(prediction.varianceFromPreviousCents))} σε σχέση με την προηγούμενη περίοδο
              </p>
            )}
          </div>

          {prediction.cashFlowWarning && (
            <div className="flex max-w-xs items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>
                <strong>Προειδοποίηση ρευστότητας:</strong> ο προβλεπόμενος ΦΠΑ είναι σημαντικά αυξημένος σε σχέση με την
                προηγούμενη περίοδο — σχεδιάστε ταμειακά.
              </span>
            </div>
          )}
        </div>

        <details className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          <summary className="cursor-pointer font-semibold text-slate-700">
            <Info className="mr-1 inline h-3.5 w-3.5" /> Πώς προκύπτει η πρόβλεψη
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {prediction.explanation.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </details>

        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Εκτίμηση για ενημερωτικούς σκοπούς — απαιτείται έλεγχος από λογιστή πριν από κάθε υποβολή δήλωσης ΦΠΑ.
        </p>
      </Card>

      {/* ── Stat cards ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={payable ? 'Πληρωτέος ΦΠΑ (επιβεβαιωμένος)' : 'Πιστωτικό υπόλοιπο ΦΠΑ'}
          value={centsEur(Math.abs(net))}
          sub={`Περίοδος ${summary.period.label} · ${summary.position.invoiceCount} παραστατικά`}
          icon={payable ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          tone={payable ? 'amber' : 'emerald'}
        />
        <StatCard
          title="ΦΠΑ εκροών (πωλήσεις)"
          value={centsEur(summary.position.outputVatCents)}
          sub={`Καθαρά έσοδα ${centsEur(summary.position.incomeNetCents)}`}
          icon={<ArrowUpCircle className="h-4 w-4" />}
          tone="blue"
        />
        <StatCard
          title="ΦΠΑ εισροών (εκπιπτόμενος)"
          value={centsEur(summary.position.inputVatCents)}
          sub={
            summary.position.nonDeductibleInputVatCents > 0
              ? `+ ${centsEur(summary.position.nonDeductibleInputVatCents)} μη εκπιπτόμενος`
              : `Καθαρές δαπάνες ${centsEur(summary.position.expenseNetCents)}`
          }
          icon={<ArrowDownCircle className="h-4 w-4" />}
          tone="violet"
        />
        <StatCard
          title="Παραστατικά προς έλεγχο"
          value={String(summary.needsReviewCount)}
          sub={summary.needsReviewCount > 0 ? 'Απαιτείται επιβεβαίωση κατηγορίας' : 'Όλα κατηγοριοποιημένα'}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={summary.needsReviewCount > 0 ? 'red' : 'emerald'}
        />
      </div>

      {/* ── Charts row ──────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900">Τάση ΦΠΑ ανά περίοδο</h3>
          <p className="mb-3 text-xs text-slate-400">
            {basis === 'quarter' ? 'Τελευταία 6 τρίμηνα' : 'Τελευταίοι 6 μήνες'} · εκροές vs εισροές
          </p>
          {summary.trend.every((t) => t.outputVatCents === 0 && t.inputVatCents === 0) ? (
            <EmptyNote text="Δεν υπάρχουν ακόμη δεδομένα — κάντε συγχρονισμό με την ΑΑΔΕ." />
          ) : (
            <>
              <BarChart groups={summary.trend.map((t) => [t.outputVatCents / 100, t.inputVatCents / 100])} />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                {summary.trend.map((t) => (
                  <span key={t.label} className="tabular-nums">
                    {t.label}:{' '}
                    <strong className={t.netVatCents >= 0 ? 'text-slate-700' : 'text-emerald-600'}>{centsEur(t.netVatCents)}</strong>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-4 rounded-sm bg-blue-600" /> ΦΠΑ εκροών
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-4 rounded-sm bg-blue-200" /> ΦΠΑ εισροών
                </span>
              </div>
            </>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900">Κατανομή ΦΠΑ ανά κατηγορία</h3>
          <p className="mb-3 text-xs text-slate-400">Περίοδος {summary.period.label} · κορυφαίες κατηγορίες</p>
          {donutSegments.length === 0 ? (
            <EmptyNote text="Καμία κατηγοριοποιημένη κίνηση στην περίοδο." />
          ) : (
            <div className="flex items-center gap-5">
              <Donut
                className="w-36 shrink-0"
                segments={donutSegments}
                centerLabel={centsEur(summary.position.netVatCents)}
                centerSub="καθαρός ΦΠΑ"
              />
              <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
                {donutSegments.map((s, i) => (
                  <li key={`${s.direction}:${s.category}`} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                      />
                      <span className="truncate">
                        {catLabel(s.category)}
                        <span className="ml-1 text-slate-400">({s.direction === 'income' ? 'έσοδα' : 'έξοδα'})</span>
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-800">{centsEur(s.vatCents)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* ── Invoices table with filters ─────────────────────────── */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Παραστατικά περιόδου</h3>
            <p className="text-xs text-slate-400">{invoiceList.total} παραστατικά · η χειροκίνητη κατηγορία υπερισχύει πάντα</p>
          </div>

          {/* filters (URL-backed) */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={searchParams.get('direction') ?? ''}
              onChange={(e) => setParams({ direction: e.target.value || null, page: null })}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700"
            >
              <option value="">Έσοδα &amp; έξοδα</option>
              <option value="income">Μόνο έσοδα</option>
              <option value="expense">Μόνο έξοδα</option>
            </select>
            <select
              value={searchParams.get('category') ?? ''}
              onChange={(e) => setParams({ category: e.target.value || null, page: null })}
              className="max-w-44 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700"
            >
              <option value="">Όλες οι κατηγορίες</option>
              {INVOICE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c].el}
                </option>
              ))}
            </select>
            <label className="flex cursor-pointer items-center gap-1.5 text-slate-600">
              <input
                type="checkbox"
                checked={searchParams.get('needsReview') === 'true'}
                onChange={(e) => setParams({ needsReview: e.target.checked ? 'true' : null, page: null })}
              />
              Προς έλεγχο
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-slate-600">
              <input
                type="checkbox"
                checked={searchParams.get('maxConfidence') !== null}
                onChange={(e) => setParams({ maxConfidence: e.target.checked ? '0.7' : null, page: null })}
              />
              Χαμηλή βεβαιότητα
            </label>
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault()
                setParams({ counterparty: counterpartyInput || null, page: null })
              }}
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={counterpartyInput}
                  onChange={(e) => setCounterpartyInput(e.target.value)}
                  placeholder="Προμηθευτής / πελάτης / ΑΦΜ"
                  className="w-44 rounded-lg border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </form>
          </div>
        </div>

        {invoiceList.invoices.length === 0 ? (
          <EmptyNote
            text={
              summary.sync.configured
                ? 'Δεν βρέθηκαν παραστατικά με αυτά τα φίλτρα. Δοκιμάστε συγχρονισμό ή αλλάξτε φίλτρα.'
                : 'Δεν υπάρχουν παραστατικά. Ρυθμίστε τη σύνδεση myDATA παρακάτω και πατήστε «Συγχρονισμός με ΑΑΔΕ».'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3 font-semibold">Ημ/νία</th>
                  <th className="py-2 pr-3 font-semibold">Παραστατικό</th>
                  <th className="py-2 pr-3 font-semibold">Συναλλασσόμενος</th>
                  <th className="py-2 pr-3 text-right font-semibold">Καθαρή αξία</th>
                  <th className="py-2 pr-3 text-right font-semibold">ΦΠΑ</th>
                  <th className="py-2 pr-3 font-semibold">Κατηγορία</th>
                  <th className="py-2 font-semibold">Βεβαιότητα</th>
                </tr>
              </thead>
              <tbody>
                {invoiceList.invoices.map((inv) => (
                  <InvoiceTableRow key={inv.id} invoice={inv} onOverride={overrideCategory} />
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Σελίδα {invoiceList.page} από {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={invoiceList.page <= 1}
                    onClick={() => setParams({ page: String(invoiceList.page - 1) })}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40"
                  >
                    Προηγούμενη
                  </button>
                  <button
                    disabled={invoiceList.page >= totalPages}
                    onClick={() => setParams({ page: String(invoiceList.page + 1) })}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40"
                  >
                    Επόμενη
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Connection settings ─────────────────────────────────── */}
      <ConnectionPanel configured={summary.sync.configured} source={summary.sync.source} onSaved={refresh} />
    </div>
  )
}

/* ─── row with inline manual override ────────────────────────── */

function InvoiceTableRow({
  invoice,
  onOverride,
}: {
  invoice: InvoiceRow
  onOverride: (invoice: InvoiceRow, category: string) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const confidence = invoice.manualCategory ? 1 : invoice.categoryConfidence ?? 0

  return (
    <tr className={`border-b border-slate-100 ${invoice.needsReview ? 'bg-amber-50/60' : ''}`}>
      <td className="py-2.5 pr-3 tabular-nums text-slate-600">{new Date(invoice.issueDate).toLocaleDateString('el-GR')}</td>
      <td className="py-2.5 pr-3">
        <div className="font-medium text-slate-800">{invoice.documentNumber ?? invoice.aadeMark ?? '—'}</div>
        <div className="text-[10px] text-slate-400">
          {invoice.direction === 'income' ? 'Έσοδο' : 'Έξοδο'}
          {invoice.source === 'aade' ? ' · myDATA' : invoice.source === 'aade_mock' ? ' · demo' : ` · ${invoice.source}`}
        </div>
      </td>
      <td className="max-w-44 py-2.5 pr-3">
        <div className="truncate text-slate-700" title={invoice.counterparty}>
          {invoice.counterparty}
        </div>
        {invoice.description && (
          <div className="truncate text-[10px] text-slate-400" title={invoice.description}>
            {invoice.description}
          </div>
        )}
      </td>
      <td className="py-2.5 pr-3 text-right tabular-nums text-slate-700">{centsEur(invoice.netCents)}</td>
      <td className="py-2.5 pr-3 text-right">
        <span className="font-semibold tabular-nums text-slate-900">{centsEur(invoice.vatCents)}</span>
        {invoice.direction === 'expense' && !invoice.vatDeductible && (
          <div className="text-[10px] text-red-500">μη εκπιπτόμενος</div>
        )}
      </td>
      <td className="py-2.5 pr-3">
        <select
          value={invoice.manualCategory ?? invoice.category}
          disabled={saving}
          onChange={async (e) => {
            setSaving(true)
            await onOverride(invoice, e.target.value)
            setSaving(false)
          }}
          className={`w-44 rounded-lg border px-2 py-1 text-xs ${
            invoice.manualCategory ? 'border-violet-300 bg-violet-50 text-violet-800' : 'border-slate-200 bg-white text-slate-700'
          }`}
          title={invoice.categoryExplanation ?? undefined}
        >
          {INVOICE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c].el}
            </option>
          ))}
          {invoice.manualCategory && <option value="__clear__">↩ Επαναφορά αυτόματης</option>}
        </select>
        {invoice.manualCategory && <div className="mt-0.5 text-[10px] font-medium text-violet-600">χειροκίνητη</div>}
      </td>
      <td className="py-2.5">
        <ConfidenceBadge
          value={confidence}
          needsReview={invoice.needsReview}
          reason={invoice.reviewReason ?? invoice.categoryExplanation}
        />
      </td>
    </tr>
  )
}

function ConfidenceBadge({ value, needsReview, reason }: { value: number; needsReview: boolean; reason: string | null }) {
  const pct = Math.round(value * 100)
  const cls = needsReview
    ? 'bg-amber-100 text-amber-800'
    : pct >= 85
      ? 'bg-emerald-100 text-emerald-700'
      : pct >= 60
        ? 'bg-blue-100 text-blue-700'
        : 'bg-slate-100 text-slate-600'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}
      title={reason ?? undefined}
    >
      {needsReview && <AlertTriangle className="h-3 w-3" />}
      {pct}%
    </span>
  )
}

/* ─── stat card ──────────────────────────────────────────────── */

const TONES: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-red-500',
}

function StatCard({
  title,
  value,
  sub,
  icon,
  tone,
}: {
  title: string
  value: string
  sub: string
  icon: React.ReactNode
  tone: keyof typeof TONES
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>{icon}</span>
        <span className="text-xs font-medium text-slate-500">{title}</span>
      </div>
      <div className="mt-2.5 font-display text-2xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>
    </Card>
  )
}

function EmptyNote({ text }: { text: string }) {
  return <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-xs text-slate-400">{text}</div>
}

/* ─── AADE connection settings ───────────────────────────────── */

function ConnectionPanel({ configured, source, onSaved }: { configured: boolean; source: string; onSaved: () => void }) {
  const [open, setOpen] = useState(!configured)
  const [aadeUserId, setAadeUserId] = useState('')
  const [subscriptionKey, setSubscriptionKey] = useState('')
  const [environment, setEnvironment] = useState('sandbox')
  const [entityVat, setEntityVat] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setErrorMsg(null)
    const r = await api('PUT', '/api/vat/aade-connection', {
      aadeUserId,
      subscriptionKey,
      environment,
      ...(entityVat ? { entityVatNumber: entityVat } : {}),
    })
    setSaving(false)
    if (!r.ok) {
      setErrorMsg(r.data?.error ?? 'Η αποθήκευση απέτυχε')
      return
    }
    setMessage('Τα στοιχεία σύνδεσης αποθηκεύτηκαν κρυπτογραφημένα.')
    setAadeUserId('')
    setSubscriptionKey('')
    onSaved()
  }

  return (
    <Card className="p-5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Settings2 className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Σύνδεση myDATA / ΑΑΔΕ</h3>
            <p className="text-xs text-slate-400">
              {configured
                ? `Ρυθμισμένη (${source === 'env' ? 'μεταβλητές περιβάλλοντος' : source === 'mock' ? 'demo δεδομένα' : 'αποθηκευμένα κρυπτογραφημένα'})`
                : 'Απαιτείται ρύθμιση για συγχρονισμό παραστατικών'}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-blue-600">{open ? 'Απόκρυψη' : 'Ρύθμιση'}</span>
      </button>

      {open && (
        <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-600">
            AADE user id (myDATA)
            <input
              value={aadeUserId}
              onChange={(e) => setAadeUserId(e.target.value)}
              required
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="π.χ. mydata-username"
            />
          </label>
          <label className="text-xs text-slate-600">
            Subscription key
            <input
              value={subscriptionKey}
              onChange={(e) => setSubscriptionKey(e.target.value)}
              required
              type="password"
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="ocp-apim-subscription-key"
            />
          </label>
          <label className="text-xs text-slate-600">
            Περιβάλλον
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="sandbox">Δοκιμαστικό (mydataapidev)</option>
              <option value="production">Παραγωγή</option>
              <option value="mock">Demo δεδομένα (χωρίς ΑΑΔΕ)</option>
            </select>
          </label>
          <label className="text-xs text-slate-600">
            ΑΦΜ οντότητας (προαιρετικό)
            <input
              value={entityVat}
              onChange={(e) => setEntityVat(e.target.value)}
              pattern="\d{9}"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="9 ψηφία"
            />
          </label>
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <p className="text-[11px] text-slate-400">
              Τα διαπιστευτήρια αποθηκεύονται κρυπτογραφημένα (AES-256-GCM) και χρησιμοποιούνται μόνο από τον διακομιστή — δεν
              εκτίθενται ποτέ στον browser.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? 'Αποθήκευση…' : 'Αποθήκευση'}
            </button>
          </div>
          {message && <p className="text-xs text-emerald-600 sm:col-span-2">{message}</p>}
          {errorMsg && <p className="text-xs text-red-600 sm:col-span-2">{errorMsg}</p>}
        </form>
      )}
    </Card>
  )
}
