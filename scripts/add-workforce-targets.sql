-- Workforce & Client Profitability: optional target/planning columns.
-- Non-destructive ALTERs (nullable, no defaults needed).
--
-- Apply to Turso:    node scripts/run-sql-file.mjs scripts/add-workforce-targets.sql
-- Apply to dev.db:   node scripts/run-sql-local.mjs scripts/add-workforce-targets.sql

ALTER TABLE "Employee" ADD COLUMN "targetUtilizationPct" REAL;
ALTER TABLE "Employee" ADD COLUMN "targetMonthlyHours" REAL;
ALTER TABLE "Employee" ADD COLUMN "targetMonthlyContribution" REAL;
ALTER TABLE "Client" ADD COLUMN "plannedMonthlyHours" REAL;
