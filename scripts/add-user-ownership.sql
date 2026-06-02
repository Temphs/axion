-- Per-user data isolation migration (non-destructive).
-- Adds a nullable userId to every domain table, backfills existing rows to the
-- earliest (manager) account, then swaps the global unique indexes for per-user
-- composite ones. No table rebuilds, no data deletion.
--
-- Apply with:  node scripts/run-sql-file.mjs scripts/add-user-ownership.sql

-- 1. Ownership columns (nullable so ADD COLUMN succeeds on populated tables).
ALTER TABLE "Employee"  ADD COLUMN "userId" TEXT;
ALTER TABLE "Client"    ADD COLUMN "userId" TEXT;
ALTER TABLE "WorkEntry" ADD COLUMN "userId" TEXT;
ALTER TABLE "ApiKey"    ADD COLUMN "userId" TEXT;
ALTER TABLE "Settings"  ADD COLUMN "userId" TEXT;

-- 2. Backfill all existing rows to the first-created user (the operator account).
UPDATE "Employee"  SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC, "id" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "Client"    SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC, "id" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "WorkEntry" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC, "id" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "ApiKey"    SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC, "id" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "Settings"  SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC, "id" ASC LIMIT 1) WHERE "userId" IS NULL;

-- 3. Replace global unique indexes with per-user composite ones.
DROP INDEX IF EXISTS "Employee_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_userId_name_key" ON "Employee"("userId", "name");

DROP INDEX IF EXISTS "Client_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Client_userId_name_key" ON "Client"("userId", "name");

DROP INDEX IF EXISTS "WorkEntry_externalId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "WorkEntry_userId_externalId_key" ON "WorkEntry"("userId", "externalId");

CREATE UNIQUE INDEX IF NOT EXISTS "Settings_userId_key" ON "Settings"("userId");

-- 4. Indexes for scoped lookups.
CREATE INDEX IF NOT EXISTS "Employee_userId_idx"  ON "Employee"("userId");
CREATE INDEX IF NOT EXISTS "Client_userId_idx"    ON "Client"("userId");
CREATE INDEX IF NOT EXISTS "WorkEntry_userId_idx" ON "WorkEntry"("userId");
CREATE INDEX IF NOT EXISTS "ApiKey_userId_idx"    ON "ApiKey"("userId");
