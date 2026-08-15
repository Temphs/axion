import { describe, it, expect } from 'vitest'
import { parseRequestedDocs, parseRequestedBookInfo } from '@/services/aade/xml'
import { parseMyDataInvoice } from '@/services/aade/mydataClient'

const SAMPLE_REQUESTED_DOC = `<?xml version="1.0" encoding="utf-8"?>
<RequestedDoc xmlns="http://www.aade.gr/myDATA/invoice/v1.0"
  xmlns:icls="https://www.aade.gr/myDATA/incomeClassificaton/v1.0">
  <continuationToken>
    <nextPartitionKey>PK1</nextPartitionKey>
    <nextRowKey>RK1</nextRowKey>
  </continuationToken>
  <invoicesDoc>
    <invoice>
      <uid>UID-001</uid>
      <mark>400001923885838</mark>
      <issuer><vatNumber>047300577</vatNumber><country>GR</country><branch>0</branch></issuer>
      <counterpart><vatNumber>099999999</vatNumber><country>GR</country><branch>0</branch></counterpart>
      <invoiceHeader>
        <series>A</series>
        <aa>101</aa>
        <issueDate>2026-05-10</issueDate>
        <invoiceType>2.1</invoiceType>
        <currency>EUR</currency>
      </invoiceHeader>
      <invoiceDetails>
        <lineNumber>1</lineNumber>
        <netValue>1000.00</netValue>
        <vatCategory>1</vatCategory>
        <vatAmount>240.00</vatAmount>
        <incomeClassification>
          <icls:classificationType>E3_561_001</icls:classificationType>
          <icls:classificationCategory>category1_3</icls:classificationCategory>
          <icls:amount>1000.00</icls:amount>
        </incomeClassification>
      </invoiceDetails>
      <invoiceSummary>
        <totalNetValue>1000.00</totalNetValue>
        <totalVatAmount>240.00</totalVatAmount>
        <totalGrossValue>1240.00</totalGrossValue>
      </invoiceSummary>
    </invoice>
    <invoice>
      <uid>UID-002</uid>
      <mark>400001923885839</mark>
      <issuer><vatNumber>800000000</vatNumber><country>GR</country></issuer>
      <invoiceHeader>
        <issueDate>2026-05-12</issueDate>
        <invoiceType>1.1</invoiceType>
        <currency>EUR</currency>
      </invoiceHeader>
      <invoiceDetails>
        <lineNumber>1</lineNumber>
        <netValue>200.00</netValue>
        <vatCategory>2</vatCategory>
        <vatAmount>26.00</vatAmount>
      </invoiceDetails>
      <invoiceDetails>
        <lineNumber>2</lineNumber>
        <netValue>50.00</netValue>
        <vatCategory>1</vatCategory>
        <vatAmount>12.00</vatAmount>
      </invoiceDetails>
      <invoiceSummary>
        <totalNetValue>250.00</totalNetValue>
        <totalVatAmount>38.00</totalVatAmount>
        <totalGrossValue>288.00</totalGrossValue>
      </invoiceSummary>
    </invoice>
  </invoicesDoc>
</RequestedDoc>`

describe('parseRequestedDocs', () => {
  it('parses invoices, keeping VAT numbers and MARKs as strings', () => {
    const result = parseRequestedDocs(SAMPLE_REQUESTED_DOC)
    expect(result.docs).toHaveLength(2)

    const [first] = result.docs
    expect(first.mark).toBe('400001923885838')
    expect(first.uid).toBe('UID-001')
    expect(first.issuer?.vatNumber).toBe('047300577') // leading zero preserved
    expect(first.counterpart?.vatNumber).toBe('099999999')
    expect(first.invoiceType).toBe('2.1')
    expect(first.series).toBe('A')
    expect(first.aa).toBe('101')
    expect(first.totalNetValue).toBe(1000)
    expect(first.totalVatAmount).toBe(240)
    expect(first.totalGrossValue).toBe(1240)
    expect(first.lines[0].vatCategory).toBe(1)
    expect(first.lines[0].classificationCategory).toBe('category1_3')
    expect(first.lines[0].classificationType).toBe('E3_561_001')
  })

  it('handles multiple invoiceDetails lines (single vs array)', () => {
    const result = parseRequestedDocs(SAMPLE_REQUESTED_DOC)
    expect(result.docs[0].lines).toHaveLength(1)
    expect(result.docs[1].lines).toHaveLength(2)
    expect(result.docs[1].lines[1].netValue).toBe(50)
  })

  it('extracts the continuation token', () => {
    const result = parseRequestedDocs(SAMPLE_REQUESTED_DOC)
    expect(result.continuationToken).toEqual({ nextPartitionKey: 'PK1', nextRowKey: 'RK1' })
  })

  it('returns empty result for empty/invalid xml', () => {
    expect(parseRequestedDocs('<foo/>')).toEqual({ docs: [], continuationToken: null })
    expect(parseRequestedDocs('')).toEqual({ docs: [], continuationToken: null })
  })

  it('is exposed through the client facade parseMyDataInvoice', () => {
    expect(parseMyDataInvoice(SAMPLE_REQUESTED_DOC)).toHaveLength(2)
  })
})

describe('parseRequestedBookInfo', () => {
  it('parses bookInfo rows', () => {
    const xml = `<RequestedBookInfo>
      <bookInfo>
        <counterVatNumber>099999999</counterVatNumber>
        <issueDate>2026-04-01</issueDate>
        <invType>2.1</invType>
        <netValue>500.00</netValue>
        <vatAmount>120.00</vatAmount>
      </bookInfo>
    </RequestedBookInfo>`
    const result = parseRequestedBookInfo(xml)
    expect(result.records).toHaveLength(1)
    expect(result.records[0].counterVatNumber).toBe('099999999')
    expect(result.records[0].netValue).toBe(500)
    expect(result.continuationToken).toBeNull()
  })
})
