import { describe, it, expect } from 'vitest'
import { parseRequestedDocs } from '@/services/aade/xml'
import { normalizeMyDataDoc, parseAadeDate, eurosToCents } from '@/services/aade/normalize'
import { normalizeMockInvoice } from '@/services/aade/dedupe'

function makeDoc(overrides: Record<string, unknown> = {}) {
  const xml = `<RequestedDoc><invoicesDoc><invoice>
    <uid>U1</uid><mark>400000000000001</mark>
    <issuer><vatNumber>111111111</vatNumber><country>${(overrides.issuerCountry as string) ?? 'GR'}</country></issuer>
    <counterpart><vatNumber>222222222</vatNumber><country>GR</country></counterpart>
    <invoiceHeader><series>B</series><aa>7</aa><issueDate>2026-05-15</issueDate><invoiceType>1.1</invoiceType><currency>EUR</currency></invoiceHeader>
    <invoiceDetails><netValue>${(overrides.net as string) ?? '100.10'}</netValue><vatCategory>${(overrides.vatCategory as string) ?? '1'}</vatCategory><vatAmount>${(overrides.vat as string) ?? '24.02'}</vatAmount></invoiceDetails>
    <invoiceSummary><totalNetValue>${(overrides.net as string) ?? '100.10'}</totalNetValue><totalVatAmount>${(overrides.vat as string) ?? '24.02'}</totalVatAmount><totalGrossValue>${(overrides.gross as string) ?? '124.12'}</totalGrossValue></invoiceSummary>
  </invoice></invoicesDoc></RequestedDoc>`
  return parseRequestedDocs(xml).docs[0]
}

describe('normalizeMyDataDoc', () => {
  it('converts amounts to integer cents without float drift', () => {
    const inv = normalizeMyDataDoc(makeDoc(), 'expense')!
    expect(inv.netCents).toBe(10010)
    expect(inv.vatCents).toBe(2402)
    expect(inv.grossCents).toBe(12412)
  })

  it('maps identifiers, parties, type and document number', () => {
    const inv = normalizeMyDataDoc(makeDoc(), 'expense')!
    expect(inv.aadeMark).toBe('400000000000001')
    expect(inv.aadeUid).toBe('U1')
    expect(inv.documentNumber).toBe('B-7')
    expect(inv.issuerVatNumber).toBe('111111111')
    expect(inv.counterpartyVatNumber).toBe('222222222')
    expect(inv.direction).toBe('expense')
    expect(inv.issueDate.toISOString().slice(0, 10)).toBe('2026-05-15')
  })

  it('derives the VAT rate from the dominant vatCategory', () => {
    expect(normalizeMyDataDoc(makeDoc(), 'income')!.vatRateBps).toBe(2400)
    expect(normalizeMyDataDoc(makeDoc({ vatCategory: '2' }), 'income')!.vatRateBps).toBe(1300)
    expect(normalizeMyDataDoc(makeDoc({ vatCategory: '3' }), 'income')!.vatRateBps).toBe(600)
  })

  it('flags intra-community expense when issuer is foreign with vatCategory 7/8', () => {
    const inv = normalizeMyDataDoc(makeDoc({ issuerCountry: 'DE', vatCategory: '8', vat: '0.00' }), 'expense')!
    expect(inv.vatTreatment).toBe('intra_community')
  })

  it('rejects docs without mark or date', () => {
    const doc = makeDoc()
    expect(normalizeMyDataDoc({ ...doc, mark: undefined }, 'income')).toBeNull()
    expect(normalizeMyDataDoc({ ...doc, issueDate: undefined }, 'income')).toBeNull()
  })

  it('keeps the raw payload for audit', () => {
    const inv = normalizeMyDataDoc(makeDoc(), 'income')!
    expect(JSON.parse(inv.rawPayload).mark).toBe('400000000000001')
  })
})

describe('parseAadeDate', () => {
  it('accepts ISO and Greek formats', () => {
    expect(parseAadeDate('2026-05-15')!.toISOString().slice(0, 10)).toBe('2026-05-15')
    expect(parseAadeDate('15/05/2026')!.toISOString().slice(0, 10)).toBe('2026-05-15')
    expect(parseAadeDate('garbage')).toBeUndefined()
  })
})

describe('eurosToCents', () => {
  it('rounds classic float traps correctly', () => {
    expect(eurosToCents(0.1 + 0.2)).toBe(30)
    expect(eurosToCents(19.99)).toBe(1999)
    expect(eurosToCents(1240)).toBe(124000)
  })
})

describe('normalizeMockInvoice', () => {
  it('maps the demo JSON shape', () => {
    const inv = normalizeMockInvoice({
      mark: '100000001',
      uid: 'fake-uid-001',
      invoiceNumber: 'ΤΠΥ-0001',
      invoiceType: '2.1',
      invoiceDate: '2026-05-10',
      issuerVatNumber: '123456789',
      counterpartyVatNumber: '987654321',
      direction: 'revenue',
      netAmount: 1000,
      vatRate: 24,
      vatAmount: 240,
      grossAmount: 1240,
      currency: 'EUR',
    })!
    expect(inv.direction).toBe('income')
    expect(inv.vatRateBps).toBe(2400)
    expect(inv.netCents).toBe(100000)
  })
})
