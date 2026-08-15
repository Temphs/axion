import { describe, it, expect } from 'vitest'
import {
  invoiceListQuerySchema,
  categoryOverrideSchema,
  syncRequestSchema,
  connectionSchema,
  summaryQuerySchema,
  parseSearchParams,
} from '@/services/vat/schemas'

describe('summaryQuerySchema', () => {
  it('defaults to quarter and accepts month', () => {
    expect(parseSearchParams(summaryQuerySchema, new URLSearchParams())).toEqual({ basis: 'quarter' })
    expect(parseSearchParams(summaryQuerySchema, new URLSearchParams('basis=month'))).toEqual({ basis: 'month' })
  })

  it('rejects unknown basis values', () => {
    const r = parseSearchParams(summaryQuerySchema, new URLSearchParams('basis=year'))
    expect(r).toHaveProperty('error')
  })
})

describe('invoiceListQuerySchema', () => {
  it('parses and coerces filters', () => {
    const r = parseSearchParams(
      invoiceListQuerySchema,
      new URLSearchParams('direction=expense&needsReview=true&maxConfidence=0.7&page=2&pageSize=10&from=2026-04-01')
    )
    expect(r).toMatchObject({ direction: 'expense', needsReview: true, maxConfidence: 0.7, page: 2, pageSize: 10 })
  })

  it('rejects invalid dates, categories and out-of-range paging', () => {
    expect(parseSearchParams(invoiceListQuerySchema, new URLSearchParams('from=01-04-2026'))).toHaveProperty('error')
    expect(parseSearchParams(invoiceListQuerySchema, new URLSearchParams('category=nonsense'))).toHaveProperty('error')
    expect(parseSearchParams(invoiceListQuerySchema, new URLSearchParams('pageSize=1000'))).toHaveProperty('error')
  })
})

describe('categoryOverrideSchema', () => {
  it('accepts a category override with note', () => {
    const r = categoryOverrideSchema.safeParse({ category: 'rent', note: 'μίσθωμα έδρας' })
    expect(r.success).toBe(true)
  })

  it('accepts null to clear the override', () => {
    expect(categoryOverrideSchema.safeParse({ category: null }).success).toBe(true)
  })

  it('rejects unknown categories, extra fields and bad percentages', () => {
    expect(categoryOverrideSchema.safeParse({ category: 'whatever' }).success).toBe(false)
    expect(categoryOverrideSchema.safeParse({ category: 'rent', hack: true }).success).toBe(false)
    expect(categoryOverrideSchema.safeParse({ category: 'rent', deductiblePct: 150 }).success).toBe(false)
  })
})

describe('syncRequestSchema', () => {
  it('accepts an empty body and a valid range', () => {
    expect(syncRequestSchema.safeParse({}).success).toBe(true)
    expect(syncRequestSchema.safeParse({ dateFrom: '2026-01-01', dateTo: '2026-03-31' }).success).toBe(true)
  })

  it('rejects inverted ranges', () => {
    expect(syncRequestSchema.safeParse({ dateFrom: '2026-03-31', dateTo: '2026-01-01' }).success).toBe(false)
  })
})

describe('connectionSchema', () => {
  it('accepts valid credentials', () => {
    const r = connectionSchema.safeParse({
      aadeUserId: 'mydata-user',
      subscriptionKey: 'k'.repeat(24),
      environment: 'sandbox',
      entityVatNumber: '123456789',
    })
    expect(r.success).toBe(true)
  })

  it('rejects malformed Greek VAT numbers and short keys', () => {
    expect(
      connectionSchema.safeParse({ aadeUserId: 'u', subscriptionKey: 'short', environment: 'sandbox' }).success
    ).toBe(false)
    expect(
      connectionSchema.safeParse({
        aadeUserId: 'u',
        subscriptionKey: 'k'.repeat(24),
        environment: 'sandbox',
        entityVatNumber: '12345',
      }).success
    ).toBe(false)
  })
})
