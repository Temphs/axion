import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { prisma } from '@/lib/db'
import { isUniqueViolation } from '@/lib/api'
import { MyDataClient, type MyDataCredentials } from './mydataClient'
import { normalizeMyDataDoc, type NormalizedInvoice, type InvoiceDirection } from './normalize'
import { splitNewAndDuplicate, maxMark, normalizeMockInvoice } from './dedupe'
import { resolveAadeConnection } from './credentials'
import { categorizeInvoice, type CorrectionExample } from '@/services/vat/categorize'
import type { InvoiceCategory } from '@/services/vat/categories'
import type { MockAadeResponse } from '@/lib/aade/types'

// Full sync pipeline: fetch → parse → normalize → categorize → dedupe → store.
// Duplicate protection is the (userId, aadeMark) unique index plus an upfront
// existence check; a concurrent insert that slips through is caught as a
// unique violation and counted as a duplicate, never an error.

export type SyncOutcome = {
  status: 'success' | 'error' | 'not_configured'
  environment: string
  fetched: number
  imported: number
  duplicates: number
  errorCode?: string
  syncLogId?: string
}

/* ─── data access ────────────────────────────────────────────── */

async function loadCorrections(userId: string): Promise<CorrectionExample[]> {
  const corrected = await prisma.invoice.findMany({
    where: { userId, manualCategory: { not: null } },
    select: { manualCategory: true, counterpartyVatNumber: true, issuerVatNumber: true, direction: true, issuerName: true, counterpartyName: true, description: true },
    orderBy: { updatedAt: 'desc' },
    take: 500,
  })
  return corrected.map((c) => ({
    category: c.manualCategory as InvoiceCategory,
    counterpartyVatNumber: c.direction === 'expense' ? c.issuerVatNumber : c.counterpartyVatNumber,
    supplierName: c.direction === 'expense' ? c.issuerName : c.counterpartyName,
    description: c.description,
  }))
}

async function lastMarkFor(userId: string, direction: InvoiceDirection): Promise<string> {
  const rows = await prisma.invoice.findMany({
    where: { userId, direction, source: 'aade', aadeMark: { not: null } },
    select: { aadeMark: true },
    orderBy: { aadeMark: 'desc' },
    take: 200, // marks are fixed-width numeric strings; top slice covers ordering edge cases
  })
  return maxMark(rows.map((r) => r.aadeMark))
}

async function existingMarkSet(userId: string, marks: string[]): Promise<Set<string>> {
  const existing = new Set<string>()
  for (let i = 0; i < marks.length; i += 200) {
    const chunk = marks.slice(i, i + 200)
    const rows = await prisma.invoice.findMany({
      where: { userId, aadeMark: { in: chunk } },
      select: { aadeMark: true },
    })
    for (const row of rows) if (row.aadeMark) existing.add(row.aadeMark)
  }
  return existing
}

async function storeInvoices(
  userId: string,
  invoices: NormalizedInvoice[],
  corrections: CorrectionExample[],
  source: string
): Promise<{ imported: number; raceDuplicates: number }> {
  const now = new Date()
  let imported = 0
  let raceDuplicates = 0
  for (const invoice of invoices) {
    const supplierName = invoice.direction === 'expense' ? invoice.issuerName : invoice.counterpartyName
    const result = categorizeInvoice(
      {
        direction: invoice.direction,
        invoiceType: invoice.invoiceType,
        aadeClassificationCategory: invoice.aadeClassificationCategory,
        aadeClassificationType: invoice.aadeClassificationType,
        counterpartyVatNumber: invoice.counterpartyVatNumber,
        issuerVatNumber: invoice.issuerVatNumber,
        supplierName,
        description: invoice.description,
        vatRateBps: invoice.vatRateBps,
        vatTreatment: invoice.vatTreatment,
        netCents: invoice.netCents,
      },
      { corrections }
    )
    try {
      await prisma.invoice.create({
        data: {
          userId,
          aadeMark: invoice.aadeMark,
          aadeUid: invoice.aadeUid,
          invoiceType: invoice.invoiceType,
          documentNumber: invoice.documentNumber,
          direction: invoice.direction,
          issuerVatNumber: invoice.issuerVatNumber,
          issuerName: invoice.issuerName,
          counterpartyVatNumber: invoice.counterpartyVatNumber,
          counterpartyName: invoice.counterpartyName,
          issueDate: invoice.issueDate,
          transmissionDate: invoice.transmissionDate,
          netCents: invoice.netCents,
          vatCents: invoice.vatCents,
          grossCents: invoice.grossCents,
          currency: invoice.currency,
          vatRateBps: invoice.vatRateBps,
          vatCategoryCode: invoice.vatCategoryCode,
          aadeClassificationCategory: invoice.aadeClassificationCategory,
          aadeClassificationType: invoice.aadeClassificationType,
          vatTreatment: invoice.vatTreatment,
          vatDeductible: result.vatDeductible,
          deductiblePct: result.deductiblePct,
          nonDeductibleReason: result.nonDeductibleReason,
          predictedCategory: result.category,
          categoryConfidence: result.confidence,
          categoryExplanation: result.explanation,
          needsReview: result.needsReview,
          reviewReason: result.reviewReason,
          description: invoice.description,
          source,
          rawPayload: invoice.rawPayload,
          syncedAt: now,
        },
      })
      imported++
    } catch (e) {
      if (isUniqueViolation(e)) raceDuplicates++
      else throw e
    }
  }
  return { imported, raceDuplicates }
}

/* ─── mock environment ───────────────────────────────────────── */

async function fetchMockInvoices(): Promise<NormalizedInvoice[]> {
  const file = path.join(process.cwd(), 'mock', 'aade', 'mydata-response-sample.json')
  const parsed = JSON.parse(await readFile(file, 'utf8')) as MockAadeResponse
  const invoices = parsed.invoices.map(normalizeMockInvoice).filter((i): i is NormalizedInvoice => i !== null)

  // The sample file ships with fixed dates. Rescale them (order preserved)
  // into the current month-to-date window, so demo syncs always produce data
  // visible in the current VAT period — for both month and quarter views.
  if (invoices.length === 0) return invoices
  const msPerDay = 86_400_000
  const now = new Date()
  const windowStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  const windowEnd = Math.max(windowStart, Date.now() - msPerDay)
  const oldMin = Math.min(...invoices.map((i) => i.issueDate.getTime()))
  const oldMax = Math.max(...invoices.map((i) => i.issueDate.getTime()))
  const scale = (windowEnd - windowStart) / Math.max(oldMax - oldMin, 1)
  return invoices.map((i) => {
    const shifted = windowStart + (i.issueDate.getTime() - oldMin) * scale
    return { ...i, issueDate: new Date(Math.floor(shifted / msPerDay) * msPerDay) }
  })
}

/* ─── the sync entry point ───────────────────────────────────── */

export type SyncOptions = {
  dateFrom?: Date
  dateTo?: Date
}

async function fetchLiveInvoices(
  userId: string,
  credentials: MyDataCredentials,
  options: SyncOptions
): Promise<NormalizedInvoice[]> {
  const client = new MyDataClient(credentials)
  const explicitRange = !!(options.dateFrom || options.dateTo)

  const [incomeMark, expenseMark] = explicitRange
    ? ['0', '0']
    : [await lastMarkFor(userId, 'income'), await lastMarkFor(userId, 'expense')]

  const [transmitted, received] = await Promise.all([
    client.requestAllDocs('transmitted', { mark: incomeMark, dateFrom: options.dateFrom, dateTo: options.dateTo }),
    client.requestAllDocs('received', { mark: expenseMark, dateFrom: options.dateFrom, dateTo: options.dateTo }),
  ])

  const normalized: NormalizedInvoice[] = []
  for (const doc of transmitted) {
    if (doc.cancelledByMark) continue // cancelled documents don't affect VAT
    const invoice = normalizeMyDataDoc(doc, 'income')
    if (invoice) normalized.push(invoice)
  }
  for (const doc of received) {
    if (doc.cancelledByMark) continue
    const invoice = normalizeMyDataDoc(doc, 'expense')
    if (invoice) normalized.push(invoice)
  }
  return normalized
}

export async function syncInvoices(userId: string, options: SyncOptions = {}): Promise<SyncOutcome> {
  const connection = await resolveAadeConnection(userId)
  if (connection.source === 'none') {
    return { status: 'not_configured', environment: connection.environment, fetched: 0, imported: 0, duplicates: 0 }
  }

  const environment = connection.environment
  const log = await prisma.vatSyncLog.create({ data: { userId, environment, status: 'running' } })

  try {
    const candidates =
      connection.source === 'mock'
        ? await fetchMockInvoices()
        : await fetchLiveInvoices(userId, connection.credentials!, options)

    const existing = await existingMarkSet(userId, candidates.map((c) => c.aadeMark))
    const { fresh, duplicates } = splitNewAndDuplicate(candidates, existing)
    const corrections = await loadCorrections(userId)
    const { imported, raceDuplicates } = await storeInvoices(
      userId,
      fresh,
      corrections,
      connection.source === 'mock' ? 'aade_mock' : 'aade'
    )

    await prisma.vatSyncLog.update({
      where: { id: log.id },
      data: {
        status: 'success',
        fetched: candidates.length,
        imported,
        duplicates: duplicates + raceDuplicates,
        finishedAt: new Date(),
      },
    })
    if (connection.source === 'database') {
      await prisma.aadeConnection.update({ where: { userId }, data: { lastSyncedAt: new Date() } })
    }

    return {
      status: 'success',
      environment,
      fetched: candidates.length,
      imported,
      duplicates: duplicates + raceDuplicates,
      syncLogId: log.id,
    }
  } catch (error) {
    // Only a sanitized machine code is persisted — upstream error bodies can
    // contain request details and must not be logged.
    const errorCode =
      error instanceof Error && 'code' in error && typeof (error as { code?: unknown }).code === 'string'
        ? ((error as { code: string }).code as string)
        : 'sync_failed'
    await prisma.vatSyncLog.update({
      where: { id: log.id },
      data: { status: 'error', errorCode, finishedAt: new Date() },
    })
    return { status: 'error', environment, fetched: 0, imported: 0, duplicates: 0, errorCode, syncLogId: log.id }
  }
}
