import { z } from 'zod'
import { INVOICE_CATEGORIES } from './categories'

// Request validation for the /api/vat/* routes. Pure module (unit tested).

export const periodBasisSchema = z.enum(['month', 'quarter'])

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected yyyy-mm-dd')
  .refine((s) => !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime()), 'invalid date')

export const summaryQuerySchema = z.object({
  basis: periodBasisSchema.default('quarter'),
})

export const predictionQuerySchema = summaryQuerySchema

export const invoiceListQuerySchema = z.object({
  direction: z.enum(['income', 'expense']).optional(),
  category: z.enum(INVOICE_CATEGORIES).optional(),
  needsReview: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  counterparty: z.string().trim().min(1).max(120).optional(),
  maxConfidence: z.coerce.number().min(0).max(1).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})

export const syncRequestSchema = z
  .object({
    dateFrom: isoDate.optional(),
    dateTo: isoDate.optional(),
  })
  .refine((v) => !(v.dateFrom && v.dateTo) || v.dateFrom <= v.dateTo, {
    message: 'dateFrom must not be after dateTo',
  })

export const categoryOverrideSchema = z
  .object({
    category: z.enum(INVOICE_CATEGORIES).nullable(), // null clears the manual override
    vatDeductible: z.boolean().optional(),
    deductiblePct: z.number().int().min(0).max(100).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict()

export const categorizeRequestSchema = z
  .object({
    // 'missing' (default) only fills invoices without a prediction;
    // 'all' recomputes everything that has no manual override.
    scope: z.enum(['missing', 'all']).default('missing'),
  })
  .strict()

export const connectionSchema = z
  .object({
    aadeUserId: z.string().trim().min(1).max(120),
    subscriptionKey: z.string().trim().min(10).max(200),
    environment: z.enum(['sandbox', 'test', 'production', 'mock']).default('sandbox'),
    entityVatNumber: z
      .string()
      .trim()
      .regex(/^\d{9}$/, 'Greek VAT numbers are 9 digits')
      .optional(),
  })
  .strict()

export function parseSearchParams<T extends z.ZodTypeAny>(
  schema: T,
  searchParams: URLSearchParams
): z.infer<T> | { error: string } {
  const raw: Record<string, string> = {}
  for (const [key, value] of searchParams.entries()) if (value !== '') raw[key] = value
  const result = schema.safeParse(raw)
  if (!result.success) return { error: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') }
  return result.data
}
