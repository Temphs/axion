import type { NormalizedInvoice, InvoiceDirection } from './normalize'
import { parseAadeDate, eurosToCents } from './normalize'
import type { VatTreatment } from '@/services/vat/categories'
import type { MockAadeInvoice } from '@/lib/aade/types'

// Pure sync helpers, kept free of Prisma/Next imports so they are unit-testable.

// Drops invoices whose MARK already exists (in the DB or earlier in the same
// batch). The (userId, aadeMark) unique index is the second line of defense.
export function splitNewAndDuplicate(
  candidates: NormalizedInvoice[],
  existingMarks: ReadonlySet<string>
): { fresh: NormalizedInvoice[]; duplicates: number } {
  const seen = new Set<string>()
  const fresh: NormalizedInvoice[] = []
  let duplicates = 0
  for (const invoice of candidates) {
    if (existingMarks.has(invoice.aadeMark) || seen.has(invoice.aadeMark)) {
      duplicates++
      continue
    }
    seen.add(invoice.aadeMark)
    fresh.push(invoice)
  }
  return { fresh, duplicates }
}

// Numeric max of MARK strings (myDATA marks are numeric); '0' when none.
// Compared by length then lexicographically, so precision never degrades.
export function maxMark(marks: Array<string | null>): string {
  let best = '0'
  for (const mark of marks) {
    if (!mark || !/^\d+$/.test(mark)) continue
    const trimmed = mark.replace(/^0+(?=\d)/, '')
    if (trimmed.length > best.length || (trimmed.length === best.length && trimmed > best)) best = trimmed
  }
  return best
}

// Converts a mock/demo record (mock/aade/*.json) to the normalized shape.
export function normalizeMockInvoice(raw: MockAadeInvoice): NormalizedInvoice | null {
  const issueDate = parseAadeDate(raw.invoiceDate)
  if (!issueDate || !raw.mark) return null
  const direction: InvoiceDirection = raw.direction === 'revenue' ? 'income' : 'expense'
  const vatRateBps = raw.vatRate != null ? Math.round(raw.vatRate * 100) : null
  let vatTreatment: VatTreatment = 'standard'
  if (raw.specialCase === 'reverse_charge') vatTreatment = 'reverse_charge'
  else if (raw.specialCase === 'intra_community') vatTreatment = 'intra_community'
  else if (vatRateBps === 0) vatTreatment = 'exempt'
  return {
    aadeMark: raw.mark,
    aadeUid: raw.uid,
    invoiceType: raw.invoiceType,
    documentNumber: raw.invoiceNumber,
    direction,
    issuerVatNumber: raw.issuerVatNumber,
    issuerName: raw.issuerName,
    counterpartyVatNumber: raw.counterpartyVatNumber,
    counterpartyName: raw.counterpartyName,
    issueDate,
    netCents: eurosToCents(raw.netAmount),
    vatCents: eurosToCents(raw.vatAmount),
    grossCents: eurosToCents(raw.grossAmount),
    currency: raw.currency || 'EUR',
    vatRateBps,
    vatCategoryCode: null,
    aadeClassificationCategory: raw.classificationCategory,
    aadeClassificationType: raw.classificationType,
    vatTreatment,
    description: raw.description,
    rawPayload: JSON.stringify(raw),
  }
}
