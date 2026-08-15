-- VAT Prediction module tables (Invoice, AadeConnection, VatSyncLog, CategoryAuditEvent).
-- Matches prisma/schema.prisma. Non-destructive: only CREATE TABLE/INDEX IF NOT EXISTS.
--
-- Apply to Turso:    node scripts/run-sql-file.mjs scripts/add-vat-module.sql
-- Apply to dev.db:   node scripts/run-sql-local.mjs scripts/add-vat-module.sql

CREATE TABLE IF NOT EXISTS "AadeConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "entityVatNumber" TEXT,
    "aadeUserIdCipher" TEXT NOT NULL,
    "subscriptionKeyCipher" TEXT NOT NULL,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AadeConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AadeConnection_userId_key" ON "AadeConnection"("userId");

CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "aadeMark" TEXT,
    "aadeUid" TEXT,
    "invoiceType" TEXT,
    "documentNumber" TEXT,
    "direction" TEXT NOT NULL,
    "issuerVatNumber" TEXT,
    "issuerName" TEXT,
    "counterpartyVatNumber" TEXT,
    "counterpartyName" TEXT,
    "issueDate" DATETIME NOT NULL,
    "transmissionDate" DATETIME,
    "netCents" INTEGER NOT NULL,
    "vatCents" INTEGER NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "vatRateBps" INTEGER,
    "vatCategoryCode" INTEGER,
    "aadeClassificationCategory" TEXT,
    "aadeClassificationType" TEXT,
    "vatTreatment" TEXT NOT NULL DEFAULT 'standard',
    "vatDeductible" BOOLEAN NOT NULL DEFAULT true,
    "deductiblePct" INTEGER NOT NULL DEFAULT 100,
    "nonDeductibleReason" TEXT,
    "predictedCategory" TEXT,
    "categoryConfidence" REAL,
    "categoryExplanation" TEXT,
    "manualCategory" TEXT,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewReason" TEXT,
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'aade',
    "rawPayload" TEXT,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_userId_aadeMark_key" ON "Invoice"("userId", "aadeMark");
CREATE INDEX IF NOT EXISTS "Invoice_userId_issueDate_idx" ON "Invoice"("userId", "issueDate");
CREATE INDEX IF NOT EXISTS "Invoice_userId_direction_idx" ON "Invoice"("userId", "direction");
CREATE INDEX IF NOT EXISTS "Invoice_userId_needsReview_idx" ON "Invoice"("userId", "needsReview");

CREATE TABLE IF NOT EXISTS "VatSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "VatSyncLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "VatSyncLog_userId_startedAt_idx" ON "VatSyncLog"("userId", "startedAt");

CREATE TABLE IF NOT EXISTS "CategoryAuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "previousCategory" TEXT,
    "newCategory" TEXT,
    "previousDeductible" BOOLEAN,
    "newDeductible" BOOLEAN,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CategoryAuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CategoryAuditEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CategoryAuditEvent_userId_createdAt_idx" ON "CategoryAuditEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "CategoryAuditEvent_invoiceId_idx" ON "CategoryAuditEvent"("invoiceId");
