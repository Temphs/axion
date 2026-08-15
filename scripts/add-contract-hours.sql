-- Per-employee contracted monthly hours. Nullable: employees without a value
-- keep using the account-wide Settings (hoursPerDay × daysPerMonth).
--
-- Apply to Turso:    node scripts/run-sql-file.mjs scripts/add-contract-hours.sql
-- Apply to dev.db:   node scripts/run-sql-local.mjs scripts/add-contract-hours.sql

ALTER TABLE "Employee" ADD COLUMN "contractHoursPerMonth" REAL;
