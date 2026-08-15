import type { InvoiceCategory, VatTreatment } from './categories'

// Greek VAT position calculation over a set of invoices.
//
//   output VAT   = VAT charged on income documents
//   input VAT    = deductible VAT on expense documents (deductiblePct applied)
//   net position = output − deductible input   (> 0 payable, < 0 credit/refund)
//
// Reverse-charge and intra-community acquisitions self-assess VAT: the same
// amount is added to output AND (to the extent deductible) to input, so a
// fully deductible acquisition is VAT-neutral. All amounts are integer cents.
// This is an estimate for review by an accountant — not a filing.

export type VatInvoiceInput = {
  direction: 'income' | 'expense'
  netCents: number
  vatCents: number
  vatRateBps?: number | null
  vatTreatment: VatTreatment | string
  vatDeductible: boolean
  deductiblePct: number // 0..100
  category: InvoiceCategory | string // effective category (manual override already applied)
  counterpartyName?: string | null
  standardRateBps?: number
}

export type VatPosition = {
  outputVatCents: number
  inputVatCents: number // deductible input VAT (incl. self-assessed, when deductible)
  nonDeductibleInputVatCents: number
  selfAssessedVatCents: number // reverse charge / intra-community output additions
  netVatCents: number // > 0 payable, < 0 refundable/credit
  incomeNetCents: number
  expenseNetCents: number
  invoiceCount: number
  byCategory: Array<{ category: string; direction: 'income' | 'expense'; netCents: number; vatCents: number; count: number }>
  byRate: Array<{ rateBps: number | null; outputVatCents: number; inputVatCents: number }>
}

const DEFAULT_STANDARD_RATE_BPS = 2400

// VAT a reverse-charge/intra-community acquisition self-assesses. If AADE
// reported no VAT on the document, estimate it from the net at the standard
// rate (the accountant confirms the correct rate on review).
function selfAssessedVat(invoice: VatInvoiceInput): number {
  if (invoice.vatCents > 0) return invoice.vatCents
  const rate = invoice.vatRateBps || invoice.standardRateBps || DEFAULT_STANDARD_RATE_BPS
  return Math.round((invoice.netCents * rate) / 10_000)
}

function deductibleShare(invoice: VatInvoiceInput, vatCents: number): number {
  if (!invoice.vatDeductible) return 0
  const pct = Math.min(100, Math.max(0, invoice.deductiblePct))
  return Math.round((vatCents * pct) / 100)
}

export function computeVatPosition(invoices: VatInvoiceInput[]): VatPosition {
  let outputVat = 0
  let inputVat = 0
  let nonDeductible = 0
  let selfAssessed = 0
  let incomeNet = 0
  let expenseNet = 0

  const byCategory = new Map<string, { category: string; direction: 'income' | 'expense'; netCents: number; vatCents: number; count: number }>()
  const byRate = new Map<number | null, { rateBps: number | null; outputVatCents: number; inputVatCents: number }>()

  for (const inv of invoices) {
    const isSelfAssessing =
      inv.direction === 'expense' &&
      (inv.vatTreatment === 'reverse_charge' || inv.vatTreatment === 'intra_community')

    let outputDelta = 0
    let inputDelta = 0
    let nonDeductibleDelta = 0

    if (inv.direction === 'income') {
      outputDelta = inv.vatCents
      incomeNet += inv.netCents
    } else {
      expenseNet += inv.netCents
      if (isSelfAssessing) {
        const assessed = selfAssessedVat(inv)
        selfAssessed += assessed
        outputDelta = assessed
        inputDelta = deductibleShare(inv, assessed)
        nonDeductibleDelta = assessed - inputDelta
      } else {
        inputDelta = deductibleShare(inv, inv.vatCents)
        nonDeductibleDelta = inv.vatCents - inputDelta
      }
    }

    outputVat += outputDelta
    inputVat += inputDelta
    nonDeductible += nonDeductibleDelta

    const key = `${inv.direction}:${inv.category}`
    const cat = byCategory.get(key) ?? { category: inv.category, direction: inv.direction, netCents: 0, vatCents: 0, count: 0 }
    cat.netCents += inv.netCents
    cat.vatCents += inv.direction === 'income' ? outputDelta : inputDelta + nonDeductibleDelta
    cat.count += 1
    byCategory.set(key, cat)

    const rateKey = inv.vatRateBps ?? null
    const rate = byRate.get(rateKey) ?? { rateBps: rateKey, outputVatCents: 0, inputVatCents: 0 }
    rate.outputVatCents += outputDelta
    rate.inputVatCents += inputDelta
    byRate.set(rateKey, rate)
  }

  return {
    outputVatCents: outputVat,
    inputVatCents: inputVat,
    nonDeductibleInputVatCents: nonDeductible,
    selfAssessedVatCents: selfAssessed,
    netVatCents: outputVat - inputVat,
    incomeNetCents: incomeNet,
    expenseNetCents: expenseNet,
    invoiceCount: invoices.length,
    byCategory: [...byCategory.values()].sort((a, b) => Math.abs(b.vatCents) - Math.abs(a.vatCents)),
    byRate: [...byRate.values()].sort((a, b) => (b.rateBps ?? -1) - (a.rateBps ?? -1)),
  }
}
