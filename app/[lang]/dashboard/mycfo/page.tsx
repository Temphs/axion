import {
  Landmark,
  TrendingUp,
  Wallet,
  LayoutDashboard,
  BarChart3,
  ArrowUpRight,
  Zap,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { notFound } from 'next/navigation'
import { Card } from '@/components/axion/ui'
import { BarChart } from '@/components/axion/charts'
import { isModuleEnabled } from '@/lib/modules'

const METRICS = [
  { label: 'Έσοδα',              value: '€48.200', trend: '+12%',         color: 'green' },
  { label: 'Έξοδα',              value: '€31.400', trend: '+4%',          color: 'red'   },
  { label: 'Εκτιμ. ΦΠΑ',        value: '€4.860',  trend: 'Σε 18 ημέρες', color: 'amber' },
  { label: 'Τρέχον Κέρδος',      value: '€16.800', trend: '+28%',         color: 'green' },
  { label: 'Ταμειακή Θέση',      value: '€22.300', trend: 'Υγιές',        color: 'green' },
]

const FEATURES = [
  {
    icon: TrendingUp,
    label: 'P&L Ανάλυση',
    desc: 'Έσοδα, έξοδα και κέρδος ανά κατηγορία και περίοδο',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
  },
  {
    icon: Wallet,
    label: 'Ταμειακές Ροές',
    desc: 'Παρακολούθηση εισροών/εκροών και πραγματικής ταμειακής θέσης',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
  },
  {
    icon: LayoutDashboard,
    label: 'Dashboards Πελατών',
    desc: 'Χρηματοοικονομικά dashboards ανά πελάτη — ΦΠΑ, Κ&Ζ, cash position',
    bg: 'bg-violet-50',
    text: 'text-violet-600',
  },
  {
    icon: BarChart3,
    label: 'Προβλέψεις & Σχεδιασμός',
    desc: 'Πρόβλεψη εσόδων, εξόδων και ταμειακής ροής για την επόμενη περίοδο',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
  },
]

export default async function MyCfoPage() {
  // Placeholder figures live on this page, so a deployment that hasn't enabled
  // the module must not be able to reach them by URL.
  if (!isModuleEnabled('mycfo')) notFound()

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/40">
          <Landmark className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            MyCFO
          </h1>
          <p className="mt-0.5 text-sm text-blue-200/80">
            Χρηματοοικονομική ευφυΐα — Κ&amp;Ζ, ταμειακές ροές, απόδοση
          </p>
        </div>
      </header>

      {/* ── Coming soon banner ──────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-6 py-8 text-center backdrop-blur-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
          <Zap className="h-3 w-3" />
          Σε ανάπτυξη &nbsp;·&nbsp; Coming Soon
        </span>
        <h2 className="font-display mx-auto mt-4 max-w-xl text-xl font-bold text-white">
          Πλήρης χρηματοοικονομική εικόνα πριν τη λήξη της περιόδου.
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-blue-100/60">
          Το MyCFO σας δίνει P&L ανάλυση, ορατότητα ταμειακών ροών και dashboards πελατών —
          ώστε να γνωρίζετε πού βρίσκεστε πριν χτυπήσουν οι προθεσμίες.
        </p>
      </div>

      {/* ── Mock financial metrics ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {METRICS.map((m) => (
          <Card key={m.label} className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
              {m.label}
            </p>
            <p className="font-display mt-1.5 text-xl font-bold tabular-nums tracking-tight text-stone-900">
              {m.value}
            </p>
            <div
              className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                m.color === 'green'
                  ? 'text-emerald-600'
                  : m.color === 'red'
                  ? 'text-red-500'
                  : 'text-amber-600'
              }`}
            >
              {m.color === 'green' && <TrendingUp className="h-3 w-3" />}
              {m.color === 'red'   && <TrendingDown className="h-3 w-3" />}
              {m.color === 'amber' && <Minus className="h-3 w-3" />}
              {m.trend}
            </div>
          </Card>
        ))}
      </div>

      {/* ── P&L bar chart preview ────────────────────────────────── */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">P&amp;L — Έσοδα vs Έξοδα</h3>
            <p className="text-xs text-slate-400">Μηνιαία σύγκριση · Demo δεδομένα</p>
          </div>
          <div className="flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
              Έσοδα
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-200" />
              Έξοδα
            </span>
          </div>
        </div>
        <BarChart
          groups={[
            [34, 28], [38, 30], [31, 33], [44, 36],
            [40, 35], [52, 41],
          ]}
        />
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
          {[
            { label: 'Έσοδα',      v: '€248k', cls: 'text-slate-900' },
            { label: 'Έξοδα',      v: '€156k', cls: 'text-slate-900' },
            { label: 'Περιθώριο',  v: '37%',   cls: 'text-emerald-600' },
          ].map(({ label, v, cls }) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3">
              <div className={`text-base font-bold tracking-tight ${cls}`}>{v}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Feature cards ────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, label, desc, bg, text }) => (
          <Card key={label} className="p-5">
            <span className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${text}`}>
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{desc}</p>
          </Card>
        ))}
      </div>

      {/* ── Bottom CTA ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur-sm">
        <div>
          <p className="text-sm font-semibold text-white">Θέλετε πρώιμη πρόσβαση στο MyCFO;</p>
          <p className="mt-0.5 text-xs text-blue-200/60">Επικοινωνήστε μαζί μας και θα σας ειδοποιήσουμε μόλις είναι διαθέσιμο.</p>
        </div>
        <a
          href="mailto:hello@axion.io"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-500"
        >
          Επικοινωνία <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}
