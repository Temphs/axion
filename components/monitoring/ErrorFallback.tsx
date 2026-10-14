'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { reportClientError } from '@/lib/monitoring/client'

// Shown by the error boundaries instead of a blank or framework error page.
// The error is reported to the admin console (server errors were already
// recorded on the server; those arrive here with only a digest and are skipped).
export function ErrorFallback({
  error,
  retry,
  tone = 'light',
}: {
  error: Error & { digest?: string }
  retry: () => void
  tone?: 'light' | 'dashboard'
}) {
  useEffect(() => {
    reportClientError(error, 'boundary')
  }, [error])

  const dashboard = tone === 'dashboard'
  return (
    <div className={`flex items-center justify-center px-4 ${dashboard ? 'py-16' : 'min-h-[60vh] py-24'}`}>
      <div className="w-full max-w-md rounded-2xl border border-slate-200/70 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-bold text-slate-900">Κάτι πήγε στραβά</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Το σφάλμα καταγράφηκε και θα το εξετάσουμε. Δοκιμάστε ξανά — αν συνεχίσει, ανανεώστε τη σελίδα.
        </p>
        {error.digest && <p className="mt-2 font-mono text-[11px] text-slate-400">Κωδικός: {error.digest}</p>}
        <button
          onClick={() => retry()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          <RotateCcw className="h-4 w-4" /> Δοκιμή ξανά
        </button>
      </div>
    </div>
  )
}
