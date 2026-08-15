import 'server-only'

import { prisma } from '@/lib/db'
import type { InvoiceModel as Invoice } from '@/lib/generated/prisma/models'
import { computeVatPosition, type VatInvoiceInput, type VatPosition } from './vatEngine'
import { predictVatPeriod, periodRange, type PredictionInvoice, type PeriodBasis, type VatPrediction } from './prediction'
import { categorizeInvoice } from './categorize'
import type { InvoiceCategory } from './categories'

// Server-side read/aggregation layer for the VAT API routes.

const MS_PER_DAY = 86_400_000

export function effectiveCategory(invoice: Pick<Invoice, 'manualCategory' | 'predictedCategory'>): string {
  return invoice.manualCategory ?? invoice.predictedCategory ?? 'other_review'
}

export function toEngineInput(invoice: Invoice): VatInvoiceInput {
  return {
    direction: invoice.direction as 'income' | 'expense',
    netCents: invoice.netCents,
    vatCents: invoice.vatCents,
    vatRateBps: invoice.vatRateBps,
    vatTreatment: invoice.vatTreatment,
    vatDeductible: invoice.vatDeductible,
    deductiblePct: invoice.deductiblePct,
    category: effectiveCategory(invoice),
    counterpartyName: invoice.direction === 'expense' ? invoice.issuerName : invoice.counterpartyName,
  }
}

function toPredictionInvoice(invoice: Invoice): PredictionInvoice {
  return {
    ...toEngineInput(invoice),
    issueDate: invoice.issueDate,
    counterpartyKey:
      (invoice.direction === 'expense' ? invoice.issuerVatNumber : invoice.counterpartyVatNumber) ??
      (invoice.direction === 'expense' ? invoice.issuerName : invoice.counterpartyName),
    needsReview: invoice.needsReview,
  }
}

/* ─── summary ────────────────────────────────────────────────── */

export type VatSummary = {
  period: { label: string; basis: PeriodBasis; start: string; end: string }
  position: VatPosition
  needsReviewCount: number
  trend: Array<{ label: string; outputVatCents: number; inputVatCents: number; netVatCents: number }>
  categoryBreakdown: VatPosition['byCategory']
  sync: {
    configured: boolean
    source: 'database' | 'env' | 'mock' | 'none'
    environment: string
    lastSyncedAt: string | null
    lastStatus: string | null
    lastError: string | null
  }
}

export async function getVatSummary(
  userId: string,
  basis: PeriodBasis,
  connectionInfo: { configured: boolean; source: 'database' | 'env' | 'mock' | 'none'; environment: string; lastSyncedAt?: Date | null },
  now = new Date()
): Promise<VatSummary> {
  const period = periodRange(now, basis)
  const trendPeriods = 6

  // One fetch covers the current period and the trend window.
  let windowStart = period.start
  for (let i = 0; i < trendPeriods; i++) {
    windowStart = periodRange(new Date(windowStart.getTime() - MS_PER_DAY), basis).start
  }

  const invoices = await prisma.invoice.findMany({
    where: { userId, issueDate: { gte: windowStart, lt: period.end } },
    orderBy: { issueDate: 'asc' },
  })

  const inCurrent = invoices.filter((i) => i.issueDate >= period.start)
  const position = computeVatPosition(inCurrent.map(toEngineInput))

  const trend: VatSummary['trend'] = []
  let cursor = period.start
  const periods: Array<{ label: string; start: Date; end: Date }> = [{ label: period.label, start: period.start, end: period.end }]
  for (let i = 0; i < trendPeriods - 1; i++) {
    const p = periodRange(new Date(cursor.getTime() - MS_PER_DAY), basis)
    periods.unshift(p)
    cursor = p.start
  }
  for (const p of periods) {
    const slice = invoices.filter((i) => i.issueDate >= p.start && i.issueDate < p.end)
    const pos = computeVatPosition(slice.map(toEngineInput))
    trend.push({ label: p.label, outputVatCents: pos.outputVatCents, inputVatCents: pos.inputVatCents, netVatCents: pos.netVatCents })
  }

  const [needsReviewCount, lastSync] = await Promise.all([
    prisma.invoice.count({ where: { userId, needsReview: true, manualCategory: null } }),
    prisma.vatSyncLog.findFirst({ where: { userId }, orderBy: { startedAt: 'desc' } }),
  ])

  return {
    period: { label: period.label, basis, start: period.start.toISOString(), end: period.end.toISOString() },
    position,
    needsReviewCount,
    trend,
    categoryBreakdown: position.byCategory,
    sync: {
      configured: connectionInfo.configured,
      source: connectionInfo.source,
      environment: connectionInfo.environment,
      lastSyncedAt:
        (connectionInfo.lastSyncedAt ?? (lastSync?.status === 'success' ? lastSync.finishedAt : null))?.toISOString() ??
        null,
      lastStatus: lastSync?.status ?? null,
      lastError: lastSync?.status === 'error' ? lastSync.errorCode : null,
    },
  }
}

/* ─── prediction ─────────────────────────────────────────────── */

export async function getVatPrediction(userId: string, basis: PeriodBasis, now = new Date()): Promise<VatPrediction> {
  const period = periodRange(now, basis)
  // ~15 months of history covers last-year seasonality plus recent periods.
  const historyStart = new Date(Date.UTC(period.start.getUTCFullYear() - 1, period.start.getUTCMonth() - 3, 1))

  const invoices = await prisma.invoice.findMany({
    where: { userId, issueDate: { gte: historyStart, lt: period.end } },
    orderBy: { issueDate: 'asc' },
  })

  const current = invoices.filter((i) => i.issueDate >= period.start).map(toPredictionInvoice)
  const history = invoices.filter((i) => i.issueDate < period.start).map(toPredictionInvoice)
  return predictVatPeriod(current, history, { now, basis })
}

/* ─── invoice list ───────────────────────────────────────────── */

export type InvoiceListFilters = {
  direction?: 'income' | 'expense'
  category?: InvoiceCategory
  needsReview?: boolean
  counterparty?: string
  maxConfidence?: number
  from?: string
  to?: string
  page: number
  pageSize: number
}

export function serializeInvoice(invoice: Invoice) {
  return {
    id: invoice.id,
    aadeMark: invoice.aadeMark,
    documentNumber: invoice.documentNumber,
    invoiceType: invoice.invoiceType,
    direction: invoice.direction,
    issueDate: invoice.issueDate.toISOString().slice(0, 10),
    counterparty:
      (invoice.direction === 'expense' ? invoice.issuerName : invoice.counterpartyName) ??
      (invoice.direction === 'expense' ? invoice.issuerVatNumber : invoice.counterpartyVatNumber) ??
      '—',
    counterpartyVatNumber: invoice.direction === 'expense' ? invoice.issuerVatNumber : invoice.counterpartyVatNumber,
    netCents: invoice.netCents,
    vatCents: invoice.vatCents,
    grossCents: invoice.grossCents,
    vatRateBps: invoice.vatRateBps,
    vatTreatment: invoice.vatTreatment,
    vatDeductible: invoice.vatDeductible,
    deductiblePct: invoice.deductiblePct,
    nonDeductibleReason: invoice.nonDeductibleReason,
    category: effectiveCategory(invoice),
    predictedCategory: invoice.predictedCategory,
    manualCategory: invoice.manualCategory,
    categoryConfidence: invoice.categoryConfidence,
    categoryExplanation: invoice.categoryExplanation,
    needsReview: invoice.needsReview,
    reviewReason: invoice.reviewReason,
    description: invoice.description,
    source: invoice.source,
    syncedAt: invoice.syncedAt?.toISOString() ?? null,
  }
}

export async function listInvoices(userId: string, filters: InvoiceListFilters) {
  const where: Record<string, unknown> = { userId }
  if (filters.direction) where.direction = filters.direction
  if (filters.needsReview !== undefined) where.needsReview = filters.needsReview
  if (filters.maxConfidence !== undefined) where.categoryConfidence = { lte: filters.maxConfidence }
  if (filters.from || filters.to) {
    where.issueDate = {
      ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00Z`) } : {}),
      ...(filters.to ? { lt: new Date(new Date(`${filters.to}T00:00:00Z`).getTime() + MS_PER_DAY) } : {}),
    }
  }
  if (filters.counterparty) {
    where.OR = [
      { issuerName: { contains: filters.counterparty } },
      { counterpartyName: { contains: filters.counterparty } },
      { issuerVatNumber: { contains: filters.counterparty } },
      { counterpartyVatNumber: { contains: filters.counterparty } },
    ]
  }
  if (filters.category) {
    // Effective category: manual override wins, else prediction.
    where.AND = [
      {
        OR: [
          { manualCategory: filters.category },
          { AND: [{ manualCategory: null }, { predictedCategory: filters.category }] },
        ],
      },
    ]
  }

  const [total, rows] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: { issueDate: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
  ])

  return { total, page: filters.page, pageSize: filters.pageSize, invoices: rows.map(serializeInvoice) }
}

/* ─── manual override (with audit) ───────────────────────────── */

export async function applyCategoryOverride(
  userId: string,
  invoiceId: string,
  patch: { category: InvoiceCategory | null; vatDeductible?: boolean; deductiblePct?: number; note?: string }
) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, userId } })
  if (!invoice) return null

  const newDeductible = patch.vatDeductible ?? invoice.vatDeductible
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        manualCategory: patch.category,
        vatDeductible: newDeductible,
        deductiblePct: patch.deductiblePct ?? (patch.vatDeductible === false ? 0 : invoice.deductiblePct),
        // A manual decision resolves the review flag.
        needsReview: false,
        reviewReason: null,
      },
    })
    await tx.categoryAuditEvent.create({
      data: {
        userId,
        invoiceId: invoice.id,
        previousCategory: invoice.manualCategory ?? invoice.predictedCategory,
        newCategory: patch.category,
        previousDeductible: invoice.vatDeductible,
        newDeductible,
        note: patch.note,
      },
    })
    return row
  })
  return serializeInvoice(updated)
}

/* ─── recategorization ───────────────────────────────────────── */

export async function recategorizeInvoices(userId: string, scope: 'missing' | 'all'): Promise<number> {
  const where =
    scope === 'all'
      ? { userId, manualCategory: null }
      : { userId, manualCategory: null, predictedCategory: null }

  const [targets, corrected] = await Promise.all([
    prisma.invoice.findMany({ where }),
    prisma.invoice.findMany({
      where: { userId, manualCategory: { not: null } },
      select: {
        manualCategory: true,
        counterpartyVatNumber: true,
        issuerVatNumber: true,
        direction: true,
        issuerName: true,
        counterpartyName: true,
        description: true,
      },
      take: 500,
    }),
  ])

  const corrections = corrected.map((c) => ({
    category: c.manualCategory as InvoiceCategory,
    counterpartyVatNumber: c.direction === 'expense' ? c.issuerVatNumber : c.counterpartyVatNumber,
    supplierName: c.direction === 'expense' ? c.issuerName : c.counterpartyName,
    description: c.description,
  }))

  let updated = 0
  for (const invoice of targets) {
    const result = categorizeInvoice(
      {
        direction: invoice.direction as 'income' | 'expense',
        invoiceType: invoice.invoiceType,
        aadeClassificationCategory: invoice.aadeClassificationCategory,
        aadeClassificationType: invoice.aadeClassificationType,
        counterpartyVatNumber: invoice.counterpartyVatNumber,
        issuerVatNumber: invoice.issuerVatNumber,
        supplierName: invoice.direction === 'expense' ? invoice.issuerName : invoice.counterpartyName,
        description: invoice.description,
        vatRateBps: invoice.vatRateBps,
        vatTreatment: invoice.vatTreatment as import('./categories').VatTreatment,
        netCents: invoice.netCents,
      },
      { corrections }
    )
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        predictedCategory: result.category,
        categoryConfidence: result.confidence,
        categoryExplanation: result.explanation,
        vatDeductible: result.vatDeductible,
        deductiblePct: result.deductiblePct,
        nonDeductibleReason: result.nonDeductibleReason,
        needsReview: result.needsReview,
        reviewReason: result.reviewReason,
      },
    })
    updated++
  }
  return updated
}
