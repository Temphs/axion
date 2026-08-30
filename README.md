# Axion

Next.js 16 app for Greek accounting practices. Three product modules share one
dashboard; only **MyEmployee** is production-ready today.

| Module | State | What it needs |
| --- | --- | --- |
| **MyEmployee** — workforce & client profitability | Complete | A database. Nothing else. |
| **VAT Analysis** — AADE / myDATA | Working, needs provisioning | The VAT tables plus AADE credentials |
| **MyCFO** | Demo shell with placeholder figures | — |

## Requirements

- Node 20+
- A libSQL/SQLite database: a local file in development, [Turso](https://turso.tech) in production

## Local setup

```bash
npm install                       # runs `prisma generate`
node scripts/run-sql-local.mjs prisma/migrations/20260525154116_init/migration.sql
node scripts/run-sql-local.mjs prisma/migrations/20260525201334_restrict_workentry_deletes/migration.sql
node scripts/run-sql-local.mjs prisma/migrations/20260525204251_add_api_keys/migration.sql
node scripts/run-sql-local.mjs scripts/add-user-ownership.sql
node scripts/run-sql-local.mjs scripts/add-contract-hours.sql
node scripts/run-sql-local.mjs scripts/add-workforce-targets.sql
npm run dev
```

Order matters. The three `prisma/migrations` files build the base schema; the
three `scripts/*.sql` files add columns the Prisma schema expects but that were
never folded back into a migration — `prisma migrate deploy` alone leaves a
database the app cannot query. For the VAT module, also apply
`scripts/add-vat-module.sql` and `scripts/add-aade-sync-ready-tables.sql`.

Against Turso, use `scripts/run-sql-file.mjs` instead of `run-sql-local.mjs`
with the same arguments.

## Environment

Copy `.env.example` to `.env.local`. For a MyEmployee-only deployment the whole
list is:

```
TURSO_DATABASE_URL=libsql://…      # omit locally to use file:./dev.db
TURSO_AUTH_TOKEN=…                 # Turso only
AXION_MODULES=myemployee
```

`AXION_MODULES` is a comma-separated allowlist of modules to expose
(`myemployee`, `vat`, `mycfo`). Unset means all three, which is what local
development wants. `myemployee` is always on — it owns the dashboard root.
Disabled modules are hidden from the navigation and their pages and API routes
return 404, so a client evaluating MyEmployee never lands on a VAT screen whose
tables were never created, or on MyCFO's placeholder numbers.

The AWS (`AWS_*`, `S3_BUCKET_NAME`) and AADE (`AADE_*`, `AXION_ENCRYPTION_KEY`)
variables are only read when an invoice upload or a myDATA sync actually runs.
A MyEmployee deployment can leave them unset and still build.

## Commands

```bash
npm run dev       # dev server
npm run build     # production build
npm run lint      # eslint
npm test          # vitest
```

## How MyEmployee works

Three records drive everything:

- **Employee** — `monthlyCost` and, optionally, `contractHoursPerMonth`.
  Hourly cost is `monthlyCost / contract hours`, falling back to the
  account-wide `hoursPerDay × daysPerMonth` from Settings when no contract is
  set. A part-timer with no contract is costed as if full-time, so their hourly
  rate reads far too low — set the contract for anyone not full-time.
- **Client** — `monthlyRevenue` (a retainer), `billable`, optional
  `plannedMonthlyHours` for budget alerts. A client with no revenue configured
  reports as `critical` health and their hours count as unbilled: that is the
  intended signal, not a bug.
- **WorkEntry** — minutes of work by one employee for one client on one day.
  Entered by hand under *Καταχωρήσεις*, or posted in batches by the companion
  time-tracking app.

Revenue is attributed per client-month, prorated by how much of the month the
reporting period covers, then split across employees pro-rata by hours worked
on that client that month. Contribution is attributed revenue minus labor cost.
All calendar maths is UTC. The pure calculations live in `lib/profitability.ts`
(unit-tested); `lib/workforce.ts` is the database-backed builder the dashboard
renders from.

Note that `lib/stats.ts` is a second, older metrics implementation behind
`/api/stats/*`. Nothing in the UI reads it and its proration differs from
`lib/workforce.ts`, so the two disagree — treat the workforce numbers as
authoritative.

## Companion app ingestion

Create a key under *API Keys* (shown once, stored as a sha256 hash) and send it
as `Authorization: Bearer axion_sk_…` or `X-API-Key`.

```
GET  /api/employees          list employees (id + name for the picker)
GET  /api/clients            list clients
POST /api/entries            create entries
```

`POST /api/entries` takes one entry or `{ "entries": [ … ] }`, up to 1000 per
request. Supplying `externalId` makes ingestion idempotent — re-sending the
same id updates that entry instead of duplicating it, so a retry after a
timeout is safe. Use it.

```json
{ "entries": [
  { "date": "2026-08-14", "employeeId": "…", "clientId": "…",
    "hours": 2.5, "workType": "Λογιστικά", "externalId": "tracker-8891" }
] }
```

Entries more than 36 hours in the future, or longer than 24 hours, are
rejected.

## Known gaps

- **No password reset.** An account locked out of its password cannot recover
  it without a manual database edit.
- **Registration is open** to anyone who reaches `/login`, rate-limited to 5
  accounts per hour per address. Each account is an isolated workspace.
- **Rate limits are per warm serverless instance**, not global — abuse damping
  rather than a hard cap.
- **No audit trail** on employee/client/entry edits, and deletes are permanent.
  Merging two clients is irreversible.
