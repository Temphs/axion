import {
  BarChart3,
  Calendar,
  AlertTriangle,
  Database,
  Bell,
  Zap,
  ArrowUpRight,
} from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { ForecastChart } from '@/components/axion/charts'

export default async function VatAnalysisPage() {
  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-900/40">
          <BarChart3 className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            VAT Analysis
          </h1>
          <p className="mt-0.5 text-sm text-blue-200/80">
            Ανάλυση &amp; πρόβλεψη ΦΠΑ · ΑΝΑΛΥΣΗ ΦΠΑ
          </p>
        </div>
      </header>

      {/* ── Coming soon banner ──────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-6 py-8 text-center backdrop-blur-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-200">
          <Zap className="h-3 w-3" />
          Σε ανάπτυξη &nbsp;·&nbsp; Coming Soon
        </span>
        <h2
          className="font-display mx-auto mt-4 max-w-xl text-xl font-bold text-white"
        >
          Πρόβλεψη ΦΠΑ πριν τις προθεσμίες — όχι την ημέρα τους.
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-blue-100/60">
          Η ενότητα VAT Analysis θα αναλύει τιμολόγια από myDATA / ΑΑΔΕ, θα προβλέπει
          υποχρεώσεις ΦΠΑ και θα σας ειδοποιεί πριν χτυπήσει ο λογαριασμός.
        </p>
      </div>

      {/* ── Feature preview grid ────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* VAT Forecast chart */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <BarChart3 className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Πρόβλεψη ΦΠΑ</h3>
              <p className="text-xs text-slate-400">Επόμενοι 6 μήνες · myDATA</p>
            </div>
          </div>
          <ForecastChart data={[16, 19, 17, 24, 22, 28, 26, 31, 34]} splitAt={5} />
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-4 rounded-sm bg-blue-600" /> Πραγματικά
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-4 rounded-sm bg-blue-300 opacity-70" /> Προβλεπόμενα
            </span>
          </div>
        </Card>

        {/* Liability calendar */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Calendar className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Ημερολόγιο Υποχρεώσεων</h3>
              <p className="text-xs text-slate-400">Επερχόμενες πληρωμές ΦΠΑ</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { month: 'Απριλίου', amount: '€18.420', days: 18, warn: true },
              { month: 'Μαΐου',    amount: '€21.050', days: 49, warn: false },
              { month: 'Ιουνίου',  amount: '€19.300', days: 80, warn: false },
            ].map(({ month, amount, days, warn }) => (
              <div
                key={month}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
                  warn ? 'border border-amber-200 bg-amber-50' : 'bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {warn && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                  <span className={`text-sm font-medium ${warn ? 'text-amber-800' : 'text-slate-700'}`}>
                    ΦΠΑ {month}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900">{amount}</div>
                  <div className={`text-[10px] ${warn ? 'text-amber-600' : 'text-slate-400'}`}>
                    σε {days} ημέρες
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* myDATA analysis */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Database className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Ανάλυση myDATA</h3>
              <p className="text-xs text-slate-400">Σύνοψη τιμολογιακής δραστηριότητας</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Τιμολόγια εισπρακτέα', v: '2.847' },
              { label: 'Τιμολόγια πληρωτέα',   v: '1.291' },
              { label: 'Αξία εσόδων',           v: '€248k' },
              { label: 'Αξία εξόδων',           v: '€156k' },
            ].map(({ label, v }) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <div className="text-lg font-bold tracking-tight text-slate-900">{v}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">Demo δεδομένα · Σύνδεση myDATA / ΑΑΔΕ σε ανάπτυξη</p>
        </Card>

        {/* Liquidity alerts */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <Bell className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Ειδοποιήσεις Ρευστότητας</h3>
              <p className="text-xs text-slate-400">Αυτόματες προειδοποιήσεις πριν τις προθεσμίες</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-amber-800">ΦΠΑ Απριλίου σε 18 ημέρες</p>
                <p className="mt-0.5 text-xs text-amber-600">Εκτιμώμενο ποσό: €18.420</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700">ΦΠΑ Μαΐου σε 49 ημέρες</p>
                <p className="mt-0.5 text-xs text-slate-400">Εκτιμώμενο ποσό: €21.050</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700">ΦΠΑ Ιουνίου σε 80 ημέρες</p>
                <p className="mt-0.5 text-xs text-slate-400">Εκτιμώμενο ποσό: €19.300</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Bottom CTA ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur-sm">
        <div>
          <p className="text-sm font-semibold text-white">Θέλετε πρώιμη πρόσβαση στο VAT Analysis;</p>
          <p className="mt-0.5 text-xs text-blue-200/60">Επικοινωνήστε μαζί μας και θα σας ειδοποιήσουμε μόλις είναι διαθέσιμο.</p>
        </div>
        <a
          href="mailto:hello@axion.io"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-violet-500"
        >
          Επικοινωνία <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}
