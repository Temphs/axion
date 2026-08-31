-- Personal entry-terminal link per employee (/t/<token>).
-- Nullable: an employee without a token simply has no terminal link yet, and
-- revoking a link sets the column back to NULL. SQLite allows many NULLs in a
-- unique index, so the constraint only applies to real tokens.
--
-- Apply to Turso:    node scripts/run-sql-file.mjs scripts/add-employee-access-token.sql
-- Apply to dev.db:   node scripts/run-sql-local.mjs scripts/add-employee-access-token.sql

ALTER TABLE "Employee" ADD COLUMN "accessToken" TEXT;
ALTER TABLE "Employee" ADD COLUMN "accessTokenAt" DATETIME;
CREATE UNIQUE INDEX "Employee_accessToken_key" ON "Employee"("accessToken");
