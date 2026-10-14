import 'server-only'
import { prisma } from '@/lib/db'

// Additive database changes the app needs, checked against the live database
// and applied from the admin console with one click. This is a fixed
// whitelist of idempotent CREATE / ALTER ... ADD statements: nothing here can
// drop or rewrite data, and no SQL ever comes from the request.

type Item =
  | { kind: 'table'; name: string; sql: string }
  | { kind: 'index'; name: string; sql: string }
  | { kind: 'column'; table: string; name: string; sql: string }

type Step = { id: string; label: string; items: Item[] }

export const SCHEMA_STEPS: Step[] = [
  {
    id: 'workforce-columns',
    label: 'Contract hours and workforce targets',
    items: [
      { kind: 'column', table: 'Employee', name: 'contractHoursPerMonth', sql: 'ALTER TABLE "Employee" ADD COLUMN "contractHoursPerMonth" REAL' },
      { kind: 'column', table: 'Employee', name: 'targetUtilizationPct', sql: 'ALTER TABLE "Employee" ADD COLUMN "targetUtilizationPct" REAL' },
      { kind: 'column', table: 'Employee', name: 'targetMonthlyHours', sql: 'ALTER TABLE "Employee" ADD COLUMN "targetMonthlyHours" REAL' },
      { kind: 'column', table: 'Employee', name: 'targetMonthlyContribution', sql: 'ALTER TABLE "Employee" ADD COLUMN "targetMonthlyContribution" REAL' },
      { kind: 'column', table: 'Client', name: 'plannedMonthlyHours', sql: 'ALTER TABLE "Client" ADD COLUMN "plannedMonthlyHours" REAL' },
    ],
  },
  {
    id: 'employee-entry-link',
    label: 'Employee entry links',
    items: [
      { kind: 'column', table: 'Employee', name: 'accessToken', sql: 'ALTER TABLE "Employee" ADD COLUMN "accessToken" TEXT' },
      { kind: 'column', table: 'Employee', name: 'accessTokenAt', sql: 'ALTER TABLE "Employee" ADD COLUMN "accessTokenAt" DATETIME' },
      { kind: 'index', name: 'Employee_accessToken_key', sql: 'CREATE UNIQUE INDEX IF NOT EXISTS "Employee_accessToken_key" ON "Employee"("accessToken")' },
    ],
  },
  {
    id: 'password-reset',
    label: 'Password reset',
    items: [
      {
        kind: 'table',
        name: 'PasswordResetToken',
        sql: 'CREATE TABLE IF NOT EXISTS "PasswordResetToken" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "expiresAt" DATETIME NOT NULL, "usedAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE)',
      },
      { kind: 'index', name: 'PasswordResetToken_tokenHash_key', sql: 'CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash")' },
      { kind: 'index', name: 'PasswordResetToken_userId_idx', sql: 'CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId")' },
    ],
  },
  {
    id: 'monitoring',
    label: 'Admin monitoring (errors and analytics)',
    items: [
      {
        kind: 'table',
        name: 'ErrorEvent',
        sql: 'CREATE TABLE IF NOT EXISTS "ErrorEvent" ("id" TEXT NOT NULL PRIMARY KEY, "fingerprint" TEXT NOT NULL, "source" TEXT NOT NULL, "kind" TEXT, "route" TEXT, "message" TEXT NOT NULL, "stack" TEXT, "count" INTEGER NOT NULL DEFAULT 1, "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastUserId" TEXT, "status" TEXT NOT NULL DEFAULT \'open\', "resolvedAt" DATETIME, CONSTRAINT "ErrorEvent_lastUserId_fkey" FOREIGN KEY ("lastUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE)',
      },
      { kind: 'index', name: 'ErrorEvent_fingerprint_key', sql: 'CREATE UNIQUE INDEX IF NOT EXISTS "ErrorEvent_fingerprint_key" ON "ErrorEvent"("fingerprint")' },
      { kind: 'index', name: 'ErrorEvent_status_lastSeenAt_idx', sql: 'CREATE INDEX IF NOT EXISTS "ErrorEvent_status_lastSeenAt_idx" ON "ErrorEvent"("status", "lastSeenAt")' },
      {
        kind: 'table',
        name: 'PageViewDaily',
        sql: 'CREATE TABLE IF NOT EXISTS "PageViewDaily" ("day" TEXT NOT NULL, "path" TEXT NOT NULL, "referrer" TEXT NOT NULL DEFAULT \'\', "country" TEXT NOT NULL DEFAULT \'\', "device" TEXT NOT NULL DEFAULT \'desktop\', "views" INTEGER NOT NULL DEFAULT 0, PRIMARY KEY ("day", "path", "referrer", "country", "device"))',
      },
      { kind: 'index', name: 'PageViewDaily_day_idx', sql: 'CREATE INDEX IF NOT EXISTS "PageViewDaily_day_idx" ON "PageViewDaily"("day")' },
      {
        kind: 'table',
        name: 'MetricDaily',
        sql: 'CREATE TABLE IF NOT EXISTS "MetricDaily" ("day" TEXT NOT NULL, "key" TEXT NOT NULL, "count" INTEGER NOT NULL DEFAULT 0, PRIMARY KEY ("day", "key"))',
      },
    ],
  },
]

export type SchemaStatus = { id: string; label: string; missing: string[] }[]

async function liveSchema() {
  const objects = await prisma.$queryRawUnsafe<{ type: string; name: string }[]>(
    "SELECT type, name FROM sqlite_master WHERE type IN ('table', 'index')"
  )
  const names = new Set(objects.map((o) => o.name))
  const columns = new Map<string, Set<string>>()
  for (const table of ['Employee', 'Client']) {
    if (!names.has(table)) continue
    const cols = await prisma.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("${table}")`)
    columns.set(table, new Set(cols.map((c) => c.name)))
  }
  const present = (item: Item) =>
    item.kind === 'column' ? (columns.get(item.table)?.has(item.name) ?? false) : names.has(item.name)
  return present
}

// Which whitelisted changes the live database is missing, by step.
export async function schemaStatus(): Promise<SchemaStatus> {
  const present = await liveSchema()
  return SCHEMA_STEPS.map((step) => ({
    id: step.id,
    label: step.label,
    missing: step.items.filter((i) => !present(i)).map((i) => (i.kind === 'column' ? `${i.table}.${i.name}` : i.name)),
  })).filter((s) => s.missing.length > 0)
}

// Applies every missing item, in order (tables before their indexes).
export async function applyMissingSchema(): Promise<string[]> {
  const present = await liveSchema()
  const applied: string[] = []
  for (const step of SCHEMA_STEPS) {
    for (const item of step.items) {
      if (present(item)) continue
      await prisma.$executeRawUnsafe(item.sql)
      applied.push(item.kind === 'column' ? `${item.table}.${item.name}` : item.name)
    }
  }
  return applied
}
