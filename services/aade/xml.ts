import { XMLParser } from 'fast-xml-parser'

// Parsing of myDATA REST API XML responses (spec v1.0.x / v2.0.x).
// RequestDocs / RequestTransmittedDocs return a <RequestedDoc> document;
// RequestMyIncome / RequestMyExpenses return a <RequestedBookInfo> document.
//
// parseTagValue is disabled on purpose: VAT numbers, MARKs and series look
// numeric and must stay strings. Amounts are converted explicitly.

const parser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
})

export type MyDataParty = {
  vatNumber?: string
  country?: string
  branch?: string
  name?: string
}

export type MyDataLine = {
  lineNumber?: number
  netValue: number
  vatCategory?: number
  vatAmount: number
  vatExemptionCategory?: number
  classificationCategory?: string
  classificationType?: string
}

export type MyDataDoc = {
  uid?: string
  mark?: string
  cancelledByMark?: string
  issuer?: MyDataParty
  counterpart?: MyDataParty
  series?: string
  aa?: string
  issueDate?: string
  invoiceType?: string
  currency?: string
  transmissionDate?: string
  lines: MyDataLine[]
  totalNetValue: number
  totalVatAmount: number
  totalGrossValue: number
}

export type ContinuationToken = { nextPartitionKey: string; nextRowKey: string } | null

export type RequestedDocResult = {
  docs: MyDataDoc[]
  continuationToken: ContinuationToken
}

export type MyDataBookRecord = {
  counterVatNumber?: string
  issueDate?: string
  invType?: string
  netValue: number
  vatAmount: number
  invoicesMark?: string
  classificationCategory?: string
  classificationType?: string
  selfPricing?: boolean
}

export type RequestedBookInfoResult = {
  records: MyDataBookRecord[]
  continuationToken: ContinuationToken
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function num(value: unknown): number {
  if (value == null || value === '') return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function intOrUndefined(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const n = Number(value)
  return Number.isInteger(n) ? n : undefined
}

function str(value: unknown): string | undefined {
  if (value == null) return undefined
  const s = String(value).trim()
  return s === '' ? undefined : s
}

function parseParty(raw: Record<string, unknown> | undefined): MyDataParty | undefined {
  if (!raw) return undefined
  return {
    vatNumber: str(raw.vatNumber),
    country: str(raw.country),
    branch: str(raw.branch),
    name: str(raw.name),
  }
}

function parseContinuation(raw: unknown): ContinuationToken {
  if (!raw || typeof raw !== 'object') return null
  const token = raw as Record<string, unknown>
  const nextPartitionKey = str(token.nextPartitionKey)
  const nextRowKey = str(token.nextRowKey)
  if (!nextPartitionKey || !nextRowKey) return null
  return { nextPartitionKey, nextRowKey }
}

function parseLine(raw: Record<string, unknown>): MyDataLine {
  const income = (raw.incomeClassification ?? undefined) as Record<string, unknown> | undefined
  const expense = (raw.expensesClassification ?? undefined) as Record<string, unknown> | undefined
  const cls = asArray<Record<string, unknown>>(income ?? expense)[0]
  return {
    lineNumber: intOrUndefined(raw.lineNumber),
    netValue: num(raw.netValue),
    vatCategory: intOrUndefined(raw.vatCategory),
    vatAmount: num(raw.vatAmount),
    vatExemptionCategory: intOrUndefined(raw.vatExemptionCategory),
    classificationCategory: cls ? str(cls.classificationCategory) : undefined,
    classificationType: cls ? str(cls.classificationType) : undefined,
  }
}

// Parses a RequestDocs / RequestTransmittedDocs XML response.
export function parseRequestedDocs(xml: string): RequestedDocResult {
  const root = parser.parse(xml)?.RequestedDoc
  if (!root) return { docs: [], continuationToken: null }

  const invoices = asArray(root.invoicesDoc?.invoice)
  const docs: MyDataDoc[] = invoices.map((inv: Record<string, unknown>) => {
    const header = (inv.invoiceHeader ?? {}) as Record<string, unknown>
    const summary = (inv.invoiceSummary ?? {}) as Record<string, unknown>
    const lines = asArray(inv.invoiceDetails as Record<string, unknown> | Record<string, unknown>[]).map(parseLine)
    return {
      uid: str(inv.uid),
      mark: str(inv.mark),
      cancelledByMark: str(inv.cancelledByMark),
      issuer: parseParty(inv.issuer as Record<string, unknown> | undefined),
      counterpart: parseParty(inv.counterpart as Record<string, unknown> | undefined),
      series: str(header.series),
      aa: str(header.aa),
      issueDate: str(header.issueDate),
      invoiceType: str(header.invoiceType),
      currency: str(header.currency) ?? 'EUR',
      transmissionDate: str(inv.transmissionDate),
      lines,
      totalNetValue: num(summary.totalNetValue),
      totalVatAmount: num(summary.totalVatAmount),
      totalGrossValue: num(summary.totalGrossValue),
    }
  })

  return { docs, continuationToken: parseContinuation(root.continuationToken) }
}

// Parses a RequestMyIncome / RequestMyExpenses XML response.
export function parseRequestedBookInfo(xml: string): RequestedBookInfoResult {
  const root = parser.parse(xml)?.RequestedBookInfo
  if (!root) return { records: [], continuationToken: null }

  const rows = asArray(root.bookInfo)
  const records: MyDataBookRecord[] = rows.map((row: Record<string, unknown>) => ({
    counterVatNumber: str(row.counterVatNumber),
    issueDate: str(row.issueDate),
    invType: str(row.invType),
    netValue: num(row.netValue),
    vatAmount: num(row.vatAmount),
    invoicesMark: str(row.invoicesMark),
    classificationCategory: str(row.classificationCategory),
    classificationType: str(row.classificationType),
    selfPricing: row.selfPricing === 'true' || row.selfPricing === true,
  }))

  return { records, continuationToken: parseContinuation(root.continuationToken) }
}
