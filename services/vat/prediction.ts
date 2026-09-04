import { computeVatPosition, type VatInvoiceInput, type VatPosition } from './vatEngine'

// VAT period-end prediction.
//
// Projects the remaining output/input VAT of the current period from:
//   1. the current period's own daily run-rate,
//   2. seasonality (same period in previous years, when available),
//   3. recurring counterparties seen in recent periods but missing so far.
//
// The result is an estimate with a low/base/high range and a plain-language
// explanation. It is decision support for an accountant, never a filing value.

export type PeriodBasis = 'month' | 'quarter'

export type PredictionInvoice = VatInvoiceInput & {
  issueDate: Date
  counterpartyKey?: string | null // VAT number (preferred) or name
  needsReview?: boolean
}

export type VatPrediction = {
  period: { start: Date; end: Date; basis: PeriodBasis; label: string }
  daysElapsed: number
  daysRemaining: number
  elapsedFraction: number

  confirmed: VatPosition

  predictedAdditionalOutputVatCents: number
  predictedAdditionalInputVatCents: number
  recurringExpectedVatCents: number

  projectedOutputVatCents: number
  projectedInputVatCents: number
  projectedNetVatCents: { low: number; base: number; high: number }

  previousPeriodNetVatCents: number | null
  varianceFromPreviousCents: number | null

  confidence: 'low' | 'medium' | 'high'
  cashFlowWarning: boolean
  invoicesNeedingReview: number
  explanation: string[]
}

const MS_PER_DAY = 86_400_000

export function periodRange(reference: Date, basis: PeriodBasis): { start: Date; end: Date; label: string } {
  const y = reference.getUTCFullYear()
  const m = reference.getUTCMonth()
  if (basis === 'month') {
    return {
      start: new Date(Date.UTC(y, m, 1)),
      end: new Date(Date.UTC(y, m + 1, 1)),
      label: `${y}-${String(m + 1).padStart(2, '0')}`,
    }
  }
  const q = Math.floor(m / 3)
  return {
    start: new Date(Date.UTC(y, q * 3, 1)),
    end: new Date(Date.UTC(y, q * 3 + 3, 1)),
    label: `${y}-Q${q + 1}`,
  }
}

export function previousPeriodRange(reference: Date, basis: PeriodBasis): { start: Date; end: Date; label: string } {
  const { start } = periodRange(reference, basis)
  return periodRange(new Date(start.getTime() - MS_PER_DAY), basis)
}

function within(date: Date, start: Date, end: Date): boolean {
  return date >= start && date < end
}

function sumVat(invoices: PredictionInvoice[], direction: 'income' | 'expense'): number {
  return computeVatPosition(invoices.filter((i) => i.direction === direction))[
    direction === 'income' ? 'outputVatCents' : 'inputVatCents'
  ]
}

// Median of monthly VAT for a counterparty across recent periods.
function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

export type PredictionOptions = {
  now?: Date
  basis?: PeriodBasis
}

export function predictVatPeriod(
  currentInvoices: PredictionInvoice[],
  historicalInvoices: PredictionInvoice[],
  options: PredictionOptions = {}
): VatPrediction {
  const now = options.now ?? new Date()
  const basis = options.basis ?? 'quarter'
  const period = periodRange(now, basis)
  const explanation: string[] = []

  const totalDays = Math.round((period.end.getTime() - period.start.getTime()) / MS_PER_DAY)
  const daysElapsed = Math.min(
    totalDays,
    Math.max(1, Math.ceil((now.getTime() - period.start.getTime()) / MS_PER_DAY))
  )
  const daysRemaining = Math.max(0, totalDays - daysElapsed)
  const elapsedFraction = daysElapsed / totalDays

  const inPeriod = currentInvoices.filter((i) => within(i.issueDate, period.start, period.end))
  const confirmed = computeVatPosition(inPeriod)

  /* ── run-rate from the current period ─────────────────────── */
  const dailyOutput = confirmed.outputVatCents / daysElapsed
  const dailyInput = confirmed.inputVatCents / daysElapsed

  /* ── seasonality: same calendar period, previous year(s) ───── */
  // seasonal factor = (VAT flow in the remaining slice of the period last
  // year) / (VAT flow in the elapsed slice last year). Falls back to 1.
  let seasonalFactor = 1
  const lastYearStart = new Date(Date.UTC(period.start.getUTCFullYear() - 1, period.start.getUTCMonth(), 1))
  const lastYearEnd = new Date(Date.UTC(period.end.getUTCFullYear() - 1, period.end.getUTCMonth(), 1))
  const lastYearPeriod = historicalInvoices.filter((i) => within(i.issueDate, lastYearStart, lastYearEnd))
  if (lastYearPeriod.length >= 5) {
    const splitDate = new Date(lastYearStart.getTime() + daysElapsed * MS_PER_DAY)
    const elapsedSlice = lastYearPeriod.filter((i) => i.issueDate < splitDate)
    const remainingSlice = lastYearPeriod.filter((i) => i.issueDate >= splitDate)
    const elapsedVat = sumVat(elapsedSlice, 'income')
    const remainingVat = sumVat(remainingSlice, 'income')
    if (elapsedVat > 0 && daysRemaining > 0) {
      const impliedDailyRemaining = remainingVat / Math.max(1, totalDays - daysElapsed)
      const impliedDailyElapsed = elapsedVat / daysElapsed
      seasonalFactor = Math.min(2.5, Math.max(0.4, impliedDailyRemaining / impliedDailyElapsed))
      explanation.push(
        `Εποχικότητα: την αντίστοιχη περίοδο πέρυσι, ο ρυθμός εσόδων στο υπόλοιπο της περιόδου ήταν ${seasonalFactor.toFixed(2)}× του ρυθμού έως σήμερα.`
      )
    }
  }

  const predictedAdditionalOutput = Math.round(dailyOutput * daysRemaining * seasonalFactor)
  const predictedAdditionalInput = Math.round(dailyInput * daysRemaining) // expenses are steadier; no seasonal scaling

  /* ── recurring counterparties not yet seen this period ─────── */
  // A counterparty is "recurring" if it appears in ≥2 of the last 3 same-basis
  // periods. If it hasn't invoiced yet this period, expect its median VAT.
  let recurringOutput = 0
  let recurringInput = 0
  // Keyed by direction as well as counterparty: the same party can both buy
  // from and sell to the business, and those are two separate expectations.
  const seenThisPeriod = new Set(
    inPeriod.filter((i) => i.counterpartyKey).map((i) => `${i.direction}:${i.counterpartyKey}`)
  )
  const recentPeriods: Array<{ start: Date; end: Date }> = []
  let cursor = new Date(period.start.getTime() - MS_PER_DAY)
  for (let k = 0; k < 3; k++) {
    const p = periodRange(cursor, basis)
    recentPeriods.push(p)
    cursor = new Date(p.start.getTime() - MS_PER_DAY)
  }

  const byCounterparty = new Map<string, { direction: 'income' | 'expense'; perPeriod: Map<number, number> }>()
  for (const inv of historicalInvoices) {
    if (!inv.counterpartyKey) continue
    const idx = recentPeriods.findIndex((p) => within(inv.issueDate, p.start, p.end))
    if (idx === -1) continue
    const key = `${inv.direction}:${inv.counterpartyKey}`
    const entry = byCounterparty.get(key) ?? { direction: inv.direction, perPeriod: new Map() }
    const vat = inv.direction === 'income' ? inv.vatCents : Math.round((inv.vatCents * (inv.vatDeductible ? Math.min(100, Math.max(0, inv.deductiblePct)) : 0)) / 100)
    entry.perPeriod.set(idx, (entry.perPeriod.get(idx) ?? 0) + vat)
    byCounterparty.set(key, entry)
  }

  let recurringCount = 0
  for (const [key, entry] of byCounterparty) {
    if (entry.perPeriod.size < 2 || seenThisPeriod.has(key)) continue
    const expected = median([...entry.perPeriod.values()])
    if (expected <= 0) continue
    recurringCount++
    if (entry.direction === 'income') recurringOutput += expected
    else recurringInput += expected
  }
  if (recurringCount > 0) {
    explanation.push(
      `${recurringCount} επαναλαμβανόμενοι συναλλασσόμενοι δεν έχουν τιμολογήσει ακόμη αυτή την περίοδο — προστέθηκε η διάμεση αξία ΦΠΑ τους.`
    )
  }

  /* ── projection & range ────────────────────────────────────── */
  const projectedOutput = confirmed.outputVatCents + predictedAdditionalOutput + recurringOutput
  const projectedInput = confirmed.inputVatCents + predictedAdditionalInput + recurringInput
  const base = projectedOutput - projectedInput

  // Uncertainty shrinks as the period fills up and as history accumulates.
  const dataScore = Math.min(1, inPeriod.length / 30) * 0.5 + Math.min(1, historicalInvoices.length / 120) * 0.5
  const uncertainty = (1 - elapsedFraction) * (0.35 - 0.2 * dataScore) + 0.05
  const predictedPart = predictedAdditionalOutput + recurringOutput + predictedAdditionalInput + recurringInput
  const spread = Math.round(Math.abs(predictedPart) * uncertainty + Math.abs(base) * uncertainty * 0.5)

  const confidence: VatPrediction['confidence'] =
    elapsedFraction > 0.7 && dataScore > 0.5 ? 'high' : dataScore > 0.3 || elapsedFraction > 0.5 ? 'medium' : 'low'

  const previousPeriod = previousPeriodRange(now, basis)
  const prevInvoices = historicalInvoices.filter((i) => within(i.issueDate, previousPeriod.start, previousPeriod.end))
  const previousNet = prevInvoices.length > 0 ? computeVatPosition(prevInvoices).netVatCents : null

  explanation.unshift(
    `Επιβεβαιωμένος ΦΠΑ ${period.label} έως σήμερα (ημέρα ${daysElapsed}/${totalDays}): εκροές ${(confirmed.outputVatCents / 100).toFixed(2)}€, εκπιπτόμενες εισροές ${(confirmed.inputVatCents / 100).toFixed(2)}€.`,
    `Προβολή υπολοίπων ${daysRemaining} ημερών με βάση τον τρέχοντα ημερήσιο ρυθμό (εκροές ${(dailyOutput / 100).toFixed(2)}€/ημέρα, εισροές ${(dailyInput / 100).toFixed(2)}€/ημέρα).`
  )
  if (previousNet != null) {
    explanation.push(
      `Προηγούμενη περίοδος (${previousPeriod.label}): καθαρή θέση ΦΠΑ ${(previousNet / 100).toFixed(2)}€.`
    )
  }
  explanation.push('Η πρόβλεψη είναι εκτίμηση και απαιτεί έλεγχο από λογιστή πριν από οποιαδήποτε υποβολή.')

  const invoicesNeedingReview = inPeriod.filter((i) => i.needsReview).length

  return {
    period: { ...period, basis },
    daysElapsed,
    daysRemaining,
    elapsedFraction,
    confirmed,
    predictedAdditionalOutputVatCents: predictedAdditionalOutput + recurringOutput,
    predictedAdditionalInputVatCents: predictedAdditionalInput + recurringInput,
    recurringExpectedVatCents: recurringOutput + recurringInput,
    projectedOutputVatCents: projectedOutput,
    projectedInputVatCents: projectedInput,
    projectedNetVatCents: { low: base - spread, base, high: base + spread },
    previousPeriodNetVatCents: previousNet,
    varianceFromPreviousCents: previousNet != null ? base - previousNet : null,
    confidence,
    cashFlowWarning: base > 0 && previousNet != null && base > Math.max(previousNet, 0) * 1.25,
    invoicesNeedingReview,
    explanation,
  }
}
