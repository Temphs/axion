import { describe, it, expect } from 'vitest'
import { computeVatPosition, type VatInvoiceInput } from '@/services/vat/vatEngine'

function inv(overrides: Partial<VatInvoiceInput>): VatInvoiceInput {
  return {
    direction: 'income',
    netCents: 100_000,
    vatCents: 24_000,
    vatRateBps: 2400,
    vatTreatment: 'standard',
    vatDeductible: true,
    deductiblePct: 100,
    category: 'sales_revenue',
    ...overrides,
  }
}

describe('computeVatPosition', () => {
  it('computes payable VAT: output minus deductible input', () => {
    const pos = computeVatPosition([
      inv({ direction: 'income', vatCents: 24_000 }),
      inv({ direction: 'expense', vatCents: 7_200, category: 'product_purchases' }),
    ])
    expect(pos.outputVatCents).toBe(24_000)
    expect(pos.inputVatCents).toBe(7_200)
    expect(pos.netVatCents).toBe(16_800) // payable
  })

  it('computes refundable/credit position when input exceeds output', () => {
    const pos = computeVatPosition([
      inv({ direction: 'income', vatCents: 5_000 }),
      inv({ direction: 'expense', vatCents: 12_000, category: 'equipment_assets' }),
    ])
    expect(pos.netVatCents).toBe(-7_000) // credit
  })

  it('excludes non-deductible input VAT and tracks it separately', () => {
    const pos = computeVatPosition([
      inv({
        direction: 'expense',
        vatCents: 2_400,
        vatDeductible: false,
        deductiblePct: 0,
        category: 'meals_entertainment',
      }),
    ])
    expect(pos.inputVatCents).toBe(0)
    expect(pos.nonDeductibleInputVatCents).toBe(2_400)
    expect(pos.netVatCents).toBe(0)
  })

  it('applies partial deductibility percentages', () => {
    const pos = computeVatPosition([
      inv({ direction: 'expense', vatCents: 10_000, deductiblePct: 50, category: 'utilities' }),
    ])
    expect(pos.inputVatCents).toBe(5_000)
    expect(pos.nonDeductibleInputVatCents).toBe(5_000)
  })

  it('reverse charge is VAT-neutral when fully deductible', () => {
    const pos = computeVatPosition([
      inv({
        direction: 'expense',
        vatCents: 0,
        netCents: 100_000,
        vatTreatment: 'reverse_charge',
        category: 'reverse_charge',
      }),
    ])
    // Self-assessed at the standard rate: +24% output, +24% deductible input.
    expect(pos.selfAssessedVatCents).toBe(24_000)
    expect(pos.outputVatCents).toBe(24_000)
    expect(pos.inputVatCents).toBe(24_000)
    expect(pos.netVatCents).toBe(0)
  })

  it('intra-community acquisition with blocked deduction creates a net liability', () => {
    const pos = computeVatPosition([
      inv({
        direction: 'expense',
        vatCents: 0,
        netCents: 50_000,
        vatTreatment: 'intra_community',
        vatDeductible: false,
        deductiblePct: 0,
        category: 'intra_community_acquisition',
      }),
    ])
    expect(pos.outputVatCents).toBe(12_000)
    expect(pos.inputVatCents).toBe(0)
    expect(pos.netVatCents).toBe(12_000)
  })

  it('aggregates by category and rate', () => {
    const pos = computeVatPosition([
      inv({ direction: 'income', vatCents: 24_000, category: 'sales_revenue' }),
      inv({ direction: 'income', vatCents: 13_000, vatRateBps: 1300, category: 'service_revenue' }),
      inv({ direction: 'expense', vatCents: 4_800, category: 'rent' }),
    ])
    expect(pos.byCategory).toHaveLength(3)
    expect(pos.byCategory[0].category).toBe('sales_revenue') // biggest VAT first
    const rate24 = pos.byRate.find((r) => r.rateBps === 2400)!
    expect(rate24.outputVatCents).toBe(24_000)
    expect(rate24.inputVatCents).toBe(4_800)
  })

  it('handles the empty set', () => {
    const pos = computeVatPosition([])
    expect(pos.netVatCents).toBe(0)
    expect(pos.invoiceCount).toBe(0)
  })
})
