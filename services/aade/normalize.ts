import type { MyDataDoc } from './xml'
import { defaultVatConfig, rateBpsForVatCategory, type VatConfig, type VatTreatment } from '@/services/vat/categories'

// Maps a parsed myDATA document into the internal invoice shape that matches
// the Prisma Invoice model. All money is integer cents.

export type InvoiceDirection = 'income' | 'expense'

export type NormalizedInvoice = {
  aadeMark: string
  aadeUid?: string
  invoiceType?: string
  documentNumber?: string
  direction: InvoiceDirection

  issuerVatNumber?: string
  issuerName?: string
  counterpartyVatNumber?: string
  counterpartyName?: string

  issueDate: Date
  transmissionDate?: Date

  netCents: number
  vatCents: number
  grossCents: number
  currency: string
  vatRateBps: number | null
  vatCategoryCode: number | null

  aadeClassificationCategory?: string
  aadeClassificationType?: string
  vatTreatment: VatTreatment
  description?: string
  rawPayload: string
}

export function eurosToCents(amount: number): number {
  return Math.round(amount * 100)
}

// myDATA issueDate is ISO (yyyy-MM-dd); some flows return dd/MM/yyyy.
export function parseAadeDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (iso) return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]))
  const gr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (gr) return new Date(Date.UTC(+gr[3], +gr[2] - 1, +gr[1]))
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

// The dominant VAT category across lines (by net value). Mixed-rate invoices
// keep their true totals; the dominant rate is informational.
function dominantVatCategory(doc: MyDataDoc): number | null {
  const byCategory = new Map<number, number>()
  for (const line of doc.lines) {
    if (line.vatCategory == null) continue
    byCategory.set(line.vatCategory, (byCategory.get(line.vatCategory) ?? 0) + Math.abs(line.netValue))
  }
  let best: number | null = null
  let bestNet = -1
  for (const [category, net] of byCategory) {
    if (net > bestNet) {
      best = category
      bestNet = net
    }
  }
  return best
}

function inferTreatment(doc: MyDataDoc, direction: InvoiceDirection, vatCategoryCode: number | null): VatTreatment {
  const issuerCountry = doc.issuer?.country?.toUpperCase()
  const counterpartCountry = doc.counterpart?.country?.toUpperCase()
  const foreignEuParty = direction === 'expense' ? issuerCountry : counterpartCountry
  const isForeign = !!foreignEuParty && foreignEuParty !== 'GR'

  // vatCategory 8 = "records without VAT" (outside VAT scope).
  if (vatCategoryCode === 8) {
    if (isForeign && direction === 'expense') return 'intra_community'
    return 'out_of_scope'
  }
  // vatCategory 7 = 0% (exempt article cases carry a vatExemptionCategory).
  if (vatCategoryCode === 7) {
    const exemption = doc.lines.find((l) => l.vatExemptionCategory != null)
    if (isForeign && direction === 'expense') return 'intra_community'
    if (isForeign && direction === 'income') return 'zero_rated'
    return exemption ? 'exempt' : 'zero_rated'
  }
  return 'standard'
}

export function normalizeMyDataDoc(
  doc: MyDataDoc,
  direction: InvoiceDirection,
  config: VatConfig = defaultVatConfig
): NormalizedInvoice | null {
  if (!doc.mark) return null
  const issueDate = parseAadeDate(doc.issueDate)
  if (!issueDate) return null

  const vatCategoryCode = dominantVatCategory(doc)
  const vatRateBps = rateBpsForVatCategory(vatCategoryCode, config)
  const firstClassified = doc.lines.find((l) => l.classificationCategory || l.classificationType)

  const documentNumber = [doc.series, doc.aa].filter(Boolean).join('-') || undefined

  return {
    aadeMark: doc.mark,
    aadeUid: doc.uid,
    invoiceType: doc.invoiceType,
    documentNumber,
    direction,

    issuerVatNumber: doc.issuer?.vatNumber,
    issuerName: doc.issuer?.name,
    counterpartyVatNumber: doc.counterpart?.vatNumber,
    counterpartyName: doc.counterpart?.name,

    issueDate,
    transmissionDate: parseAadeDate(doc.transmissionDate),

    netCents: eurosToCents(doc.totalNetValue),
    vatCents: eurosToCents(doc.totalVatAmount),
    grossCents: eurosToCents(doc.totalGrossValue),
    currency: doc.currency ?? 'EUR',
    vatRateBps,
    vatCategoryCode,

    aadeClassificationCategory: firstClassified?.classificationCategory,
    aadeClassificationType: firstClassified?.classificationType,
    vatTreatment: inferTreatment(doc, direction, vatCategoryCode),
    // Raw payload keeps the parsed doc (not the full XML) — enough for audit
    // without duplicating megabytes of markup per row.
    rawPayload: JSON.stringify(doc),
  }
}
