'use client' // Error boundaries must be Client Components

import { ErrorFallback } from '@/components/monitoring/ErrorFallback'

// Keeps the dashboard sidebar visible when one page fails.
export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorFallback error={error} retry={retry} tone="dashboard" />
}
