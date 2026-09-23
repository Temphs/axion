'use client'

import { useEffect, useState } from 'react'
import { Link2, RefreshCw } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { api } from '@/components/dashboard/api'

export function WorkLogLinkCard({ lang, employeeId, employeeName }: { lang: string; employeeId: string; employeeName: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  function toUrl(token: string) {
    return `${window.location.origin}/${lang}/log/${token}`
  }

  useEffect(() => {
    let cancelled = false
    api('GET', `/api/employees/${employeeId}/log-link`).then((r) => {
      if (!cancelled && r.ok) setUrl(toUrl(r.data.token))
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId])

  async function copy() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function regenerate() {
    if (!confirm('Ο παλιός σύνδεσμος θα σταματήσει να λειτουργεί. Συνέχεια;')) return
    setBusy(true)
    const r = await api('POST', `/api/employees/${employeeId}/log-link`)
    setBusy(false)
    if (r.ok) setUrl(toUrl(r.data.token))
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-slate-900">
        <Link2 size={16} className="text-blue-500" />
        <h3 className="text-sm font-semibold">Σύνδεσμος καταγραφής ώρας</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Στείλε τον σε {employeeName} — καταχωρεί ώρες από το κινητό του, χωρίς λογαριασμό.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {url ?? 'Δημιουργία συνδέσμου…'}
        </code>
        <button
          onClick={copy}
          disabled={!url}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {copied ? 'Αντιγράφηκε' : 'Αντιγραφή'}
        </button>
        <button
          onClick={regenerate}
          disabled={!url || busy}
          title="Νέος σύνδεσμος"
          className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </Card>
  )
}
