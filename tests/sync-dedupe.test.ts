import { describe, it, expect } from 'vitest'
import { splitNewAndDuplicate, maxMark } from '@/services/aade/dedupe'
import type { NormalizedInvoice } from '@/services/aade/normalize'

function inv(mark: string): NormalizedInvoice {
  return {
    aadeMark: mark,
    direction: 'income',
    issueDate: new Date('2026-05-01'),
    netCents: 100,
    vatCents: 24,
    grossCents: 124,
    currency: 'EUR',
    vatRateBps: 2400,
    vatCategoryCode: 1,
    vatTreatment: 'standard',
    rawPayload: '{}',
  }
}

describe('splitNewAndDuplicate', () => {
  it('drops marks that already exist in the database', () => {
    const { fresh, duplicates } = splitNewAndDuplicate([inv('1'), inv('2'), inv('3')], new Set(['2']))
    expect(fresh.map((i) => i.aadeMark)).toEqual(['1', '3'])
    expect(duplicates).toBe(1)
  })

  it('drops repeated marks within the same batch', () => {
    const { fresh, duplicates } = splitNewAndDuplicate([inv('5'), inv('5'), inv('6')], new Set())
    expect(fresh.map((i) => i.aadeMark)).toEqual(['5', '6'])
    expect(duplicates).toBe(1)
  })

  it('passes everything through when nothing matches', () => {
    const { fresh, duplicates } = splitNewAndDuplicate([inv('7')], new Set(['8']))
    expect(fresh).toHaveLength(1)
    expect(duplicates).toBe(0)
  })
})

describe('maxMark', () => {
  it('returns the numeric maximum as a string', () => {
    expect(maxMark(['400001923885838', '400001923885839', '99'])).toBe('400001923885839')
  })

  it('ignores nulls and non-numeric values, defaulting to "0"', () => {
    expect(maxMark([null, 'abc', ''])).toBe('0')
    expect(maxMark([])).toBe('0')
  })
})
