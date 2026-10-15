import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatDay, formatTime, todayInGreece } from '@/lib/datetime'

// 21:30 UTC on 14 Oct is 00:30 on 15 Oct in Athens (UTC+3 in summer time).
const LATE = '2026-10-14T21:30:00.000Z'

describe('date text is the same wherever it is rendered', () => {
  it('shows timestamps in Greek time, whatever the machine zone', () => {
    expect(formatTime(LATE, 'en-GB')).toBe('00:30')
    expect(formatDate(LATE)).toBe('15/10/2026')
    expect(formatDateTime(LATE, 'en-GB')).toBe('15/10/2026, 00:30')
  })

  it('shows stored calendar days as the day they represent', () => {
    expect(formatDay('2026-10-14T00:00:00.000Z')).toBe('14/10/2026')
  })

  it("gives Greece's today, not the server's", () => {
    expect(todayInGreece(LATE)).toBe('2026-10-15')
    expect(todayInGreece('2026-01-31T22:30:00.000Z')).toBe('2026-02-01') // winter time, UTC+2
  })
})
