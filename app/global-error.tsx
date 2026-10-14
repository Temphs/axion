'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'
import { reportClientError } from '@/lib/monitoring/client'

// Last resort when the root layout itself fails. It replaces the whole
// document, so it carries its own <html>/<body> and inline styles (global CSS
// is not loaded here).
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportClientError(error, 'boundary')
  }, [error])

  return (
    <html lang="el">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f8fafc', color: '#0f172a' }}>
        <title>Axion — σφάλμα</title>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ maxWidth: 420, textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 32 }}>
            <h1 style={{ fontSize: 18, margin: '0 0 6px' }}>Κάτι πήγε στραβά</h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Το σφάλμα καταγράφηκε. Δοκιμάστε ξανά ή ανανεώστε τη σελίδα.</p>
            <button
              onClick={() => retry()}
              style={{ marginTop: 20, background: '#2563eb', color: '#fff', border: 0, borderRadius: 12, padding: '10px 16px', fontWeight: 600, cursor: 'pointer' }}
            >
              Δοκιμή ξανά
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
