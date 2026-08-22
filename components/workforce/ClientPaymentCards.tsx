'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Download, Search, TriangleAlert } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { eur, hrs, num, pct } from '@/lib/format'
import { outstandingAmount, paymentStatusOf, type ClientAttention, type ClientRow, type PaymentStatus } from '@/lib/profitability'
import type { ClientPaymentRecord } from '@/lib/payments'
import { downloadCsv } from './csv'

// One card per client answering a single question: how much do they pay me,
// how much of my team do they consume, and what is left over?
//   Contribution = Revenue − Labor cost      Margin = Contribution ÷ Revenue
// Labor cost only — no overhead allocation, stated in the footnote.

const PAGE = 12

const STATUS: Record<PaymentStatus, { label: string; cls: string }> = {
  paid: { label: 'Εξοφλημένο', cls: 'bg-emerald-50 text-emerald-700' },
  partial: { label: 'Μερικώς πληρωμένο', cls: 'bg-amber-50 text-amber-700' },
  outstanding: { label: 'Σε εκκρεμότητα', cls: 'bg-red-50 text-red-600' },
  unknown: { label: 'Χωρίς στοιχεία πληρωμής', cls: 'bg-slate-100 text-slate-500' },
}

export function ClientPaymentCards({
  clients,
  payments,
  lang,
  limit,
  moreHref,
  attention = [],
}: {
  clients: ClientRow[]
  payments: ClientPaymentRecord[]
  lang: string
  limit?: number
  moreHref?: string
  attention?: ClientAttention[]
}) {
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(limit ?? PAGE)

  const paymentOf = useMemo(() => new Map(payments.map((p) => [p.clientId, p])), [payments])
  const warningOf = useMemo(() => new Map(attention.map((a) => [a.clientId, a])), [attention])

  const billable = useMemo(() => clients.filter((c) => c.billable), [clients])
  const matches = useMemo(() => {
    const query = q.trim().toLowerCase()
    return billable
      .filter((c) => (query ? c.name.toLowerCase().includes(query) : true))
      .sort((a, b) => b.revenue - a.revenue || b.hours - a.hours)
  }, [billable, q])

  // A search should look through everything, not just the visible page.
  const visible = q.trim() ? matches : matches.slice(0, shown)
  const hiddenCount = matches.length - visible.length

  const exportCsv = () =>
    downloadCsv(
      'client-payments.csv',
      ['Client', 'Monthly fee', 'Hours', 'Labor cost', 'Contribution', 'Margin %'],
      billable.map((c) => [
        c.name,
        c.revenue,
        c.hours,
        c.laborCost,
        c.contribution,
        c.margin !== null ? Math.round(c.margin * 1000) / 10 : null,
      ])
    )

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Πελάτες</h2>
          <p className="text-xs text-blue-200/70">Τι πληρώνει ο καθένας, πόσο χρόνο καταναλώνει και τι αφήνει</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Αναζήτηση…"
              className="w-40 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-sm text-slate-900 outline-none transition focus:border-blue-400"
            />
          </div>
          <button
            onClick={exportCsv}
            title="Εξαγωγή CSV"
            className="inline-flex items-center gap-1 rounded-lg border border-white/30 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white"
          >
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-400">
          Κανένας χρεώσιμος πελάτης με δραστηριότητα στην περίοδο.
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {visible.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              payment={paymentOf.get(client.id)}
              warning={warningOf.get(client.id)}
              lang={lang}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-blue-200/60">Μόνο κόστος εργασίας — χωρίς κατανομή γενικών εξόδων.</p>
        {hiddenCount > 0 &&
          (moreHref ? (
            <Link href={moreHref} className="inline-flex items-center gap-0.5 text-xs font-medium text-blue-200 hover:text-white">
              Όλοι οι πελάτες ({num(hiddenCount)} ακόμη) <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <button
              onClick={() => setShown((n) => n + PAGE * 2)}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-100 transition hover:bg-white/20"
            >
              Περισσότεροι ({num(hiddenCount)} ακόμη)
            </button>
          ))}
      </div>
    </section>
  )
}

function ClientCard({
  client,
  payment,
  warning,
  lang,
}: {
  client: ClientRow
  payment?: ClientPaymentRecord
  warning?: ClientAttention
  lang: string
}) {
  const [open, setOpen] = useState(false)

  const invoiced = payment?.invoiced ?? null
  const paid = payment?.paid ?? null
  const outstanding = outstandingAmount(invoiced, paid)
  const status = paymentStatusOf({ invoiced, paid })

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full px-5 py-4 text-left transition hover:bg-slate-50"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-900">{client.name}</span>
            <span className="mt-0.5 block text-xs text-slate-400">
              {client.revenue > 0 ? `${eur(client.monthlyRevenue)} / μήνα` : 'Δεν έχει οριστεί αμοιβή'}
            </span>
          </span>
          <ChevronDown size={16} className={'mt-0.5 shrink-0 text-slate-400 transition ' + (open ? 'rotate-180' : '')} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Money label="Αμοιβή" value={client.revenue > 0 ? eur(client.revenue) : '—'} strong />
          <Money label="Ώρες ομάδας" value={hrs(client.hours)} />
          <Money label="Κόστος εργασίας" value={eur(client.laborCost)} />
          <Money
            label="Συνεισφορά"
            value={client.revenue > 0 ? eur(client.contribution) : '—'}
            tone={client.revenue > 0 ? (client.contribution >= 0 ? 'pos' : 'neg') : undefined}
            strong
          />
          <Money label="Περιθώριο" value={pct(client.margin)} tone={marginTone(client.margin)} />
        </div>

        {/* Payment strip — states plainly when nothing has been recorded. */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3 text-xs">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS[status].cls}`}>
            {STATUS[status].label}
          </span>
          {invoiced !== null && <Detail label="Τιμολογήθηκε" value={eur(invoiced)} />}
          {paid !== null && <Detail label="Πληρώθηκε" value={eur(paid)} />}
          {outstanding !== null && outstanding > 0 && (
            <Detail label="Υπόλοιπο" value={eur(outstanding)} tone="warn" />
          )}
        </div>

        {warning && (
          <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-snug text-amber-600">
            <TriangleAlert size={12} className="mt-0.5 shrink-0" />
            {warning.reason}
          </p>
        )}
      </button>

      {open && <ClientDetail client={client} payment={payment} lang={lang} />}
    </Card>
  )
}

function ClientDetail({
  client,
  payment,
  lang,
}: {
  client: ClientRow
  payment?: ClientPaymentRecord
  lang: string
}) {
  return (
    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">Ποιοι δούλεψαν εδώ</p>
      {client.employees.length === 0 ? (
        <p className="text-xs text-slate-400">Καμία καταχώρηση στην περίοδο.</p>
      ) : (
        <ul className="space-y-1.5">
          {client.employees.map((e) => (
            <li key={e.employeeId} className="flex items-center justify-between gap-3 text-sm">
              <Link
                href={`/${lang}/dashboard/employees/${e.employeeId}`}
                className="truncate font-medium text-blue-600 hover:underline"
              >
                {e.employeeName}
              </Link>
              <span className="shrink-0 tabular-nums text-slate-500">
                {hrs(e.hours)} <span className="text-slate-400">· {eur(e.laborCost)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-3 space-y-1.5 border-t border-slate-200/70 pt-3 text-sm">
        <Row label="Σύνολο ωρών" value={hrs(client.hours)} />
        <Row label="Σύνολο κόστους εργασίας" value={eur(client.laborCost)} />
        <Row label="Αμοιβή περιόδου" value={client.revenue > 0 ? eur(client.revenue) : '—'} />
        <Row
          label="Συνεισφορά"
          value={client.revenue > 0 ? eur(client.contribution) : '—'}
          tone={client.revenue > 0 ? (client.contribution >= 0 ? 'pos' : 'neg') : undefined}
        />
        <Row label="Περιθώριο" value={pct(client.margin)} />
      </dl>

      <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">Ιστορικό πληρωμών</p>
      {payment && payment.history.length > 0 ? (
        <ul className="mt-1.5 space-y-1 text-sm">
          {payment.history.map((h) => (
            <li key={h.month} className="flex items-center justify-between gap-3">
              <span className="text-slate-500">{h.month}</span>
              <span className="tabular-nums text-slate-700">
                {eur(h.paid)} <span className="text-slate-400">/ {eur(h.invoiced)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-slate-400">
          Δεν έχουν καταγραφεί πληρωμές — δεν υπάρχει ακόμη σχετικό πεδίο στην εφαρμογή.
        </p>
      )}

      <Link
        href={`/${lang}/dashboard/clients/${client.id}`}
        className="mt-3 inline-flex items-center gap-0.5 text-xs font-medium text-blue-600 hover:underline"
      >
        Καρτέλα πελάτη <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

function marginTone(margin: number | null): 'pos' | 'neg' | undefined {
  if (margin === null) return undefined
  if (margin >= 0.45) return 'pos'
  if (margin < 0.2) return 'neg'
  return undefined
}

function Money({
  label,
  value,
  tone,
  strong,
}: {
  label: string
  value: string
  tone?: 'pos' | 'neg'
  strong?: boolean
}) {
  const cls = tone === 'pos' ? 'text-emerald-600' : tone === 'neg' ? 'text-red-500' : 'text-slate-900'
  return (
    <div>
      <p className={`tabular-nums ${strong ? 'font-display text-lg font-semibold leading-none' : 'text-sm font-semibold'} ${cls}`}>
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-tight text-slate-400">{label}</p>
    </div>
  )
}

function Detail({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <span className="text-slate-400">
      {label}: <span className={'font-medium tabular-nums ' + (tone === 'warn' ? 'text-amber-600' : 'text-slate-700')}>{value}</span>
    </span>
  )
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={
          'font-medium tabular-nums ' +
          (tone === 'pos' ? 'text-emerald-600' : tone === 'neg' ? 'text-red-500' : 'text-slate-800')
        }
      >
        {value}
      </dd>
    </div>
  )
}
