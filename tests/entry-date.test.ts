import { describe, expect, it } from 'vitest'
import { parseEntryDate } from '@/lib/entryDate'

const NOW = new Date('2026-10-12T10:00:00Z')
const day = (input: unknown) => {
  const r = parseEntryDate(input, NOW)
  return 'date' in r ? r.date.toISOString().slice(0, 10) : r.error
}

describe('parseEntryDate', () => {
  it('keeps plain dates as the same calendar day', () => {
    expect(day('2026-10-01')).toBe('2026-10-01')
  })

  it('stores the day at UTC midnight', () => {
    const r = parseEntryDate('2026-10-01', NOW)
    expect('date' in r && r.date.toISOString()).toBe('2026-10-01T00:00:00.000Z')
  })

  it('takes the date part of a wall-clock time with no offset', () => {
    expect(day('2026-10-01T23:30:00')).toBe('2026-10-01')
  })

  it('uses the Greek calendar day for timestamps with an offset', () => {
    // Just after midnight in Athens is still the previous day in UTC.
    expect(day('2026-10-01T00:30:00+03:00')).toBe('2026-10-01')
    expect(day('2026-09-30T21:30:00Z')).toBe('2026-10-01')
    // Winter time (UTC+2).
    expect(day('2026-01-31T22:30:00Z')).toBe('2026-02-01')
  })

  it('rejects impossible, ancient and future dates', () => {
    expect(day('2026-02-31')).toMatch(/invalid date/)
    expect(day('not a date')).toMatch(/invalid date/)
    expect(day('1999-12-31')).toMatch(/2000 or later/)
    expect(day('2062-10-01')).toMatch(/future/)
    expect(day('')).toMatch(/required/)
    expect(day(undefined)).toMatch(/required/)
  })

  it('allows tomorrow (time-zone slack) but not the day after', () => {
    expect(day('2026-10-13')).toBe('2026-10-13')
    expect(day('2026-10-14')).toMatch(/future/)
  })
})
