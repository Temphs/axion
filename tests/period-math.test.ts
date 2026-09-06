import { describe, it, expect } from 'vitest'
import { monthCoverage, monthsInPeriod, previousPeriodOf, utilizationOf } from '@/lib/profitability'

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
  it('is the billable share of the hours actually entered', () => {
    // 90 billable + 30 overhead = 120 logged, of which 75% is chargeable.
    expect(utilizationOf({ billableHours: 90, nonBillableHours: 30 })).toBeCloseTo(0.75)
  })

  it('reaches 100% only when no overhead was logged', () => {
    expect(utilizationOf({ billableHours: 40, nonBillableHours: 0 })).toBe(1)
    expect(utilizationOf({ billableHours: 0, nonBillableHours: 40 })).toBe(0)
  })

  it('does not depend on contracted capacity', () => {
    // Someone who logged 8 of 10 hours is at 80% whether or not the month is full.
    expect(utilizationOf({ billableHours: 8, nonBillableHours: 2 })).toBeCloseTo(0.8)
    expect(utilizationOf({ billableHours: 800, nonBillableHours: 200 })).toBeCloseTo(0.8)
  })

  it('has no value when nothing was entered, rather than reporting zero', () => {
    expect(utilizationOf({ billableHours: 0, nonBillableHours: 0 })).toBeNull()
  })
})
