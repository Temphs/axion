import { describe, it, expect } from 'vitest'
import { predictVatPeriod, periodRange, previousPeriodRange, type PredictionInvoice } from '@/services/vat/prediction'

function inv(overrides: Partial<PredictionInvoice> & { issueDate: Date }): PredictionInvoice {
  return {
    direction: 'income',
    netCents: 100_000,
    vatCents: 24_000,
    vatRateBps: 2400,
    vatTreatment: 'standard',
    vatDeductible: false,
    deductiblePct: 0,
    category: 'sales_revenue',
    counterpartyKey: null,
    ...overrides,
  }
}

const NOW = new Date(Date.UTC(2026, 4, 16)) // 2026-05-16, mid Q2

describe('periodRange', () => {
  it('computes month and quarter boundaries', () => {
    const month = periodRange(NOW, 'month')
    expect(month.label).toBe('2026-05')
    expect(month.start.toISOString().slice(0, 10)).toBe('2026-05-01')
    expect(month.end.toISOString().slice(0, 10)).toBe('2026-06-01')

    const quarter = periodRange(NOW, 'quarter')
    expect(quarter.label).toBe('2026-Q2')
    expect(quarter.start.toISOString().slice(0, 10)).toBe('2026-04-01')
    expect(quarter.end.toISOString().slice(0, 10)).toBe('2026-07-01')
  })

  it('computes the previous period', () => {
    expect(previousPeriodRange(NOW, 'quarter').label).toBe('2026-Q1')
    expect(previousPeriodRange(NOW, 'month').label).toBe('2026-04')
  })
})

describe('predictVatPeriod', () => {
  it('projects period-end VAT from the current run-rate', () => {
    // 15 days elapsed of a 30-day month, 12.000€ output VAT so far → ~24.000€ projected.
    const current = [
      inv({ issueDate: new Date(Date.UTC(2026, 4, 5)), vatCents: 600_000 }),
      inv({ issueDate: new Date(Date.UTC(2026, 4, 12)), vatCents: 600_000 }),
    ]
    const p = predictVatPeriod(current, [], { now: new Date(Date.UTC(2026, 4, 16)), basis: 'month' })

    expect(p.confirmed.outputVatCents).toBe(1_200_000)
    expect(p.projectedOutputVatCents).toBeGreaterThan(1_200_000)
    expect(p.projectedNetVatCents.base).toBe(p.projectedOutputVatCents - p.projectedInputVatCents)
    expect(p.projectedNetVatCents.low).toBeLessThanOrEqual(p.projectedNetVatCents.base)
    expect(p.projectedNetVatCents.high).toBeGreaterThanOrEqual(p.projectedNetVatCents.base)
  })

  it('nets confirmed input VAT against output', () => {
    const current = [
      inv({ issueDate: new Date(Date.UTC(2026, 4, 5)), vatCents: 500_000 }),
      inv({
        issueDate: new Date(Date.UTC(2026, 4, 6)),
        direction: 'expense',
        vatCents: 200_000,
        vatDeductible: true,
        deductiblePct: 100,
        category: 'product_purchases',
      }),
    ]
    const p = predictVatPeriod(current, [], { now: new Date(Date.UTC(2026, 4, 16)), basis: 'month' })
    expect(p.confirmed.netVatCents).toBe(300_000)
  })

  it('adds recurring counterparties that have not invoiced yet this period', () => {
    const history: PredictionInvoice[] = []
    // Supplier "landlord" invoiced in each of the 3 previous months.
    for (const month of [1, 2, 3]) {
      history.push(
        inv({
          issueDate: new Date(Date.UTC(2026, month, 10)),
          direction: 'expense',
          vatCents: 48_000,
          vatDeductible: true,
          deductiblePct: 100,
          category: 'rent',
          counterpartyKey: 'landlord',
        })
      )
    }
    const withoutRecurring = predictVatPeriod([], [], { now: NOW, basis: 'month' })
    const withRecurring = predictVatPeriod([], history, { now: NOW, basis: 'month' })
    expect(withRecurring.recurringExpectedVatCents).toBe(48_000)
    expect(withRecurring.projectedInputVatCents - withoutRecurring.projectedInputVatCents).toBe(48_000)
  })

  it('reports variance against the previous period', () => {
    const history = [
      inv({ issueDate: new Date(Date.UTC(2026, 3, 10)), vatCents: 100_000 }), // April = previous month
    ]
    const current = [inv({ issueDate: new Date(Date.UTC(2026, 4, 8)), vatCents: 200_000 })]
    const p = predictVatPeriod(current, history, { now: NOW, basis: 'month' })
    expect(p.previousPeriodNetVatCents).toBe(100_000)
    expect(p.varianceFromPreviousCents).toBe(p.projectedNetVatCents.base - 100_000)
  })

  it('raises the cash-flow warning when projection far exceeds the previous period', () => {
    const history = [inv({ issueDate: new Date(Date.UTC(2026, 3, 10)), vatCents: 10_000 })]
    const current = [inv({ issueDate: new Date(Date.UTC(2026, 4, 5)), vatCents: 900_000 })]
    const p = predictVatPeriod(current, history, { now: NOW, basis: 'month' })
    expect(p.cashFlowWarning).toBe(true)
  })

  it('degrades to low confidence with sparse data and always explains itself', () => {
    const p = predictVatPeriod([], [], { now: new Date(Date.UTC(2026, 4, 2)), basis: 'quarter' })
    expect(p.confidence).toBe('low')
    expect(p.explanation.length).toBeGreaterThan(0)
    expect(p.explanation.join(' ')).toContain('λογιστή') // accountant disclaimer present
  })

  it('counts invoices flagged for review', () => {
    const current = [inv({ issueDate: new Date(Date.UTC(2026, 4, 5)), needsReview: true })]
    const p = predictVatPeriod(current, [], { now: NOW, basis: 'month' })
    expect(p.invoicesNeedingReview).toBe(1)
  })
})

describe('recurring counterparties are tracked per direction', () => {
  // A party the business both sells to and buys from. It has already invoiced
  // us this period as a supplier, but has not been billed as a customer, so
  // only the income side should still be expected.
  const both = 'EL123456789'
  const historical = [
    inv({ issueDate: new Date(Date.UTC(2026, 2, 10)), direction: 'income', vatCents: 50_000, counterpartyKey: both }),
    inv({ issueDate: new Date(Date.UTC(2026, 1, 10)), direction: 'income', vatCents: 50_000, counterpartyKey: both }),
    inv({
      issueDate: new Date(Date.UTC(2026, 2, 12)),
      direction: 'expense',
      vatCents: 20_000,
      vatDeductible: true,
      deductiblePct: 100,
      counterpartyKey: both,
    }),
    inv({
      issueDate: new Date(Date.UTC(2026, 1, 12)),
      direction: 'expense',
      vatCents: 20_000,
      vatDeductible: true,
      deductiblePct: 100,
      counterpartyKey: both,
    }),
  ]

  it('still expects the income side when only the expense side has arrived', () => {
    const current = [
      inv({
        issueDate: new Date(Date.UTC(2026, 4, 4)),
        direction: 'expense',
        vatCents: 20_000,
        vatDeductible: true,
        deductiblePct: 100,
        counterpartyKey: both,
      }),
    ]
    const p = predictVatPeriod(current, historical, { now: NOW, basis: 'month' })
    expect(p.recurringExpectedVatCents).toBe(50_000) // the unbilled income side only
  })

  it('expects nothing recurring once both directions have arrived', () => {
    const current = [
      inv({ issueDate: new Date(Date.UTC(2026, 4, 4)), direction: 'income', vatCents: 50_000, counterpartyKey: both }),
      inv({
        issueDate: new Date(Date.UTC(2026, 4, 4)),
        direction: 'expense',
        vatCents: 20_000,
        vatDeductible: true,
        deductiblePct: 100,
        counterpartyKey: both,
      }),
    ]
    const p = predictVatPeriod(current, historical, { now: NOW, basis: 'month' })
    expect(p.recurringExpectedVatCents).toBe(0)
  })
})
