import { describe, it, expect } from 'vitest'
import { monthCoverage, monthsInPeriod, previousPeriodOf, utilizationOf, utilizedHours } from '@/lib/profitability'

const MS_PER_DAY = 86_400_000
const spanDays = (from: Date, to: Date) =>
  Math.floor(to.getTime() / MS_PER_DAY) - Math.floor(from.getTime() / MS_PER_DAY) + 1

describe('monthCoverage counts whole calendar days', () => {
  it('is independent of the time of day carried by the end bound', () => {
    const from = new Date(Date.UTC(2026, 2, 1))
    const expected = 15 / 31 // Mar 1..Mar 15 inclusive, of a 31-day month
    for (const hour of [0, 6, 12, 14, 23]) {
      const to = new Date(Date.UTC(2026, 2, 15, hour, 30))
      expect(monthCoverage(from, to).get('2026-03')).toBeCloseTo(expected, 10)
    }
    const endOfDay = new Date(Date.UTC(2026, 2, 15, 23, 59, 59, 999))
    expect(monthCoverage(from, endOfDay).get('2026-03')).toBeCloseTo(expected, 10)
  })

  it('gives exactly 1 for a full calendar month, whatever its length', () => {
    for (const [monthIndex, days] of [[1, 28], [2, 31], [3, 30]] as const) {
      const from = new Date(Date.UTC(2026, monthIndex, 1))
      const to = new Date(Date.UTC(2026, monthIndex, days, 23, 59, 59, 999))
      expect(monthsInPeriod(from, to)).toBe(1)
    }
  })
})

describe('previousPeriodOf', () => {
  it('shifts month-aligned periods back by whole calendar months', () => {
    const prev = previousPeriodOf(new Date(Date.UTC(2026, 2, 1)), new Date(Date.UTC(2026, 2, 31, 23, 59, 59, 999)))
    expect(prev.from.toISOString()).toBe('2026-02-01T00:00:00.000Z')
    expect(prev.to.toISOString()).toBe('2026-02-28T23:59:59.999Z')
  })

  it('gives an arbitrary range a previous window of the same length in days', () => {
    const bounds: Array<[Date, Date]> = [
      [new Date(Date.UTC(2026, 2, 10)), new Date(Date.UTC(2026, 2, 19, 23, 59, 59, 999))],
      [new Date(Date.UTC(2026, 2, 10)), new Date(Date.UTC(2026, 2, 19))],
    ]
    for (const [from, to] of bounds) {
      const prev = previousPeriodOf(from, to)
      expect(spanDays(prev.from, prev.to)).toBe(spanDays(from, to))
      expect(prev.to.getTime()).toBe(from.getTime() - 1) // contiguous, no gap
    }
  })
})

describe('utilization is one definition everywhere', () => {
  const hours = { billableHours: 90, nonBillableHours: 30 }

  it('counts billable hours only when overhead is excluded', () => {
    expect(utilizedHours(hours, false)).toBe(90)
    expect(utilizationOf(hours, 160, false)).toBeCloseTo(0.5625)
  })

  it('counts overhead hours too when the account includes them', () => {
    expect(utilizedHours(hours, true)).toBe(120)
    expect(utilizationOf(hours, 160, true)).toBeCloseTo(0.75)
  })

  it('has no value without capacity, rather than reporting zero', () => {
    expect(utilizationOf(hours, 0, false)).toBeNull()
  })

  it('matches the per-month form the employee cards used to compute', () => {
    // hours / (contracted hours x months) === (hours / months) / contracted hours
    const billableHours = 420
    const contracted = 160
    const months = 3
    expect(utilizationOf({ billableHours, nonBillableHours: 0 }, contracted * months, false)).toBeCloseTo(
      billableHours / months / contracted
    )
  })
})
