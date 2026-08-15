import { describe, it, expect } from 'vitest'
import { categorizeInvoice, foldGreek } from '@/services/vat/categorize'

describe('foldGreek', () => {
  it('lowercases and strips accents', () => {
    expect(foldGreek('Ενοίκιο ΓΡΑΦΕΊΟΥ')).toBe('ενοικιο γραφειου')
  })
})

describe('categorizeInvoice — rules', () => {
  it('maps myDATA income classification to service revenue', () => {
    const r = categorizeInvoice({ direction: 'income', aadeClassificationCategory: 'category1_3' })
    expect(r.category).toBe('service_revenue')
    expect(r.method).toBe('rule')
    expect(r.confidence).toBeGreaterThan(0.8)
    expect(r.explanation).toContain('category1_3')
  })

  it('maps expense classification category2_5 to non-deductible with zero deduction', () => {
    const r = categorizeInvoice({ direction: 'expense', aadeClassificationCategory: 'category2_5' })
    expect(r.category).toBe('non_deductible')
    expect(r.vatDeductible).toBe(false)
    expect(r.deductiblePct).toBe(0)
  })

  it('classifies income by invoice type when classification is missing', () => {
    expect(categorizeInvoice({ direction: 'income', invoiceType: '2.1' }).category).toBe('service_revenue')
    expect(categorizeInvoice({ direction: 'income', invoiceType: '1.1' }).category).toBe('sales_revenue')
    expect(categorizeInvoice({ direction: 'income', invoiceType: '11.1' }).category).toBe('sales_revenue')
  })

  it('classifies rent from Greek keywords (accent-insensitive)', () => {
    const r = categorizeInvoice({
      direction: 'expense',
      description: 'Μηνιαίο ενοίκιο γραφείου Μαΐου',
    })
    expect(r.category).toBe('rent')
    expect(r.vatDeductible).toBe(true)
  })

  it('classifies utilities from supplier name', () => {
    const r = categorizeInvoice({ direction: 'expense', supplierName: 'ΔΕΗ Α.Ε.' })
    expect(r.category).toBe('utilities')
  })

  it('marks meals/entertainment VAT as non-deductible and needing review', () => {
    const r = categorizeInvoice({ direction: 'expense', description: 'Γεύμα εργασίας σε εστιατόριο' })
    expect(r.category).toBe('meals_entertainment')
    expect(r.vatDeductible).toBe(false)
    expect(r.needsReview).toBe(true)
    expect(r.nonDeductibleReason).toBeTruthy()
  })

  it('flags fuel/vehicle expenses for deductibility review', () => {
    const r = categorizeInvoice({ direction: 'expense', supplierName: 'SHELL ΠΡΑΤΗΡΙΟ', description: 'Καύσιμα' })
    expect(r.category).toBe('fuel_vehicle')
    expect(r.vatDeductible).toBe(false)
    expect(r.needsReview).toBe(true)
  })

  it('categorizes intra-community acquisitions from VAT treatment', () => {
    const r = categorizeInvoice({ direction: 'expense', vatTreatment: 'intra_community', supplierName: 'ACME GmbH' })
    expect(r.category).toBe('intra_community_acquisition')
    expect(r.needsReview).toBe(true)
  })

  it('falls back to other_review with low confidence for unknown expenses', () => {
    const r = categorizeInvoice({ direction: 'expense', description: 'ΧΨΩ 123' })
    expect(r.category).toBe('other_review')
    expect(r.needsReview).toBe(true)
    expect(r.confidence).toBeLessThan(0.5)
    expect(r.method).toBe('fallback')
  })
})

describe('categorizeInvoice — learning from corrections', () => {
  it('reuses the accountant’s past correction for the same counterparty VAT', () => {
    const r = categorizeInvoice(
      { direction: 'expense', issuerVatNumber: '999888777', supplierName: 'Unknown Vendor' },
      {
        corrections: [
          { counterpartyVatNumber: '999888777', category: 'professional_services' },
          { counterpartyVatNumber: '999888777', category: 'professional_services' },
        ],
      }
    )
    expect(r.category).toBe('professional_services')
    expect(r.method).toBe('learned')
    expect(r.confidence).toBeGreaterThanOrEqual(0.9)
    expect(r.needsReview).toBe(false)
  })

  it('learns from similar descriptions when no rule matches', () => {
    const corrections = [
      { category: 'equipment_assets' as const, description: 'Προμήθεια ανταλλακτικών εκτυπωτή XEROX' },
      { category: 'equipment_assets' as const, description: 'Ανταλλακτικά εκτυπωτή και σαρωτή' },
      { category: 'rent' as const, description: 'κοινόχρηστα πολυκατοικίας' },
    ]
    const r = categorizeInvoice(
      { direction: 'expense', description: 'Ανταλλακτικά εκτυπωτή laser' },
      { corrections }
    )
    expect(r.category).toBe('equipment_assets')
    expect(r.method).toBe('learned')
  })

  it('income invoices never carry deductible input VAT', () => {
    const r = categorizeInvoice({ direction: 'income', invoiceType: '2.1' })
    expect(r.vatDeductible).toBe(false)
    expect(r.deductiblePct).toBe(0)
  })
})
