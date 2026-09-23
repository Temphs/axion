-- Per-employee public work-log link (/log/[token]). Nullable: a token is
-- generated lazily the first time a manager opens an employee's "time-log
-- link" panel (see lib/employeeLog.ts), so no backfill is required here.
--
-- Apply to Turso:    node scripts/run-sql-file.mjs scripts/add-employee-log-token.sql
-- Apply to dev.db:   node scripts/run-sql-local.mjs scripts/add-employee-log-token.sql

ALTER TABLE "Employee" ADD COLUMN "logToken" TEXT;
CREATE UNIQUE INDEX "Employee_logToken_key" ON "Employee"("logToken");
