'use client' // Error boundaries must be Client Components

import { ErrorFallback } from '@/components/monitoring/ErrorFallback'

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorFallback error={error} retry={retry} />
}
