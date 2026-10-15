'use client'

import { useSyncExternalStore } from 'react'
import { formatDateTime, formatTime } from '@/lib/datetime'

// The admin's own clock. The server renders Greek time (it can't know the
// viewer's zone), then the browser switches to its local time right after
// hydration. useSyncExternalStore makes that switch without a hydration
// mismatch, which formatting in the viewer's zone directly would cause.

const noSubscribe = () => () => {}

export function LocalTime({ iso, withDate = false }: { iso: string; withDate?: boolean }) {
  const text = useSyncExternalStore(
    noSubscribe,
    () =>
      new Date(iso).toLocaleString('en-GB', {
        ...(withDate ? { day: '2-digit', month: '2-digit', year: 'numeric' } : {}),
        hour: '2-digit',
        minute: '2-digit',
      }),
    () => (withDate ? formatDateTime(iso, 'en-GB') : formatTime(iso, 'en-GB'))
  )
  return <time dateTime={iso}>{text}</time>
}
