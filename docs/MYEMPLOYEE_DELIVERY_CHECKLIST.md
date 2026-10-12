# MyEmployee — delivery checklist (security · GDPR · functional)

Built from a full read of the MyEmployee code on `main` (commit `d5b55f4`), plus a
local run with seeded data. Every item names the file/line it comes from, so it
can be checked or turned into a ticket.

**Priority**
- **P0**: blocks delivery. Do not hand MyEmployee to a customer before these are done.
- **P1**: needed before the first paying customer relies on it (or within the first weeks).
- **P2**: hardening. Plan it, but it doesn't block delivery.

> GDPR items describe what the code does and what is usually expected of a SaaS
> vendor that processes employee data. They are not legal advice. Have the
> P0 legal documents reviewed by a lawyer/DPO familiar with Greek law 4624/2019.

---

## 0. Already in good shape ✅

Shown so nobody spends time re-checking them:

- [x] **Tenant isolation.** Every query in `app/api/**`, `lib/stats.ts` and `lib/workforce.ts` is scoped by `userId`; `[id]` routes check ownership before update/delete; batch ingestion verifies that referenced employees/clients belong to the caller (`app/api/entries/route.ts:130-147`).
- [x] **Passwords** hashed with scrypt + per-user salt, constant-time compare (`lib/auth.ts`).
- [x] **API keys** stored as SHA-256 hashes only, shown once, soft-revocable (`lib/auth.ts`, `app/api/api-keys/**`).
- [x] **Session cookie** is `httpOnly`, `SameSite=Lax`, `Secure` in production.
- [x] **Password change** re-verifies the current password, is rate-limited, and kills other sessions (`app/api/account/password/route.ts`).
- [x] **Delete safety.** Employees/clients with logged work can't be hard-deleted by accident (`onDelete: Restrict`).
- [x] **Hosting region.** Vercel functions pinned to Dublin (`vercel.json` → `dub1`).
- [x] **No tracking.** No analytics or third-party scripts; fonts are self-hosted by `next/font` (no Google Fonts calls at runtime); the only cookie is the strictly-necessary session cookie, so no cookie banner is needed while this stays true.
- [x] **No raw SQL / no `dangerouslySetInnerHTML`** in the MyEmployee surface.
- [x] Unit tests pass (`npm test`: 11 files, 102 tests).

---

## 1. Security

### P0
- [ ] **Rate-limit login and signup.** Neither route has any throttle, so passwords can be brute-forced and accounts mass-created. Reuse `lib/rateLimit.ts` (already used for password change): e.g. 10 attempts / 15 min per IP + per email on `app/api/auth/login/route.ts:14`, and per IP on signup. Because the limiter is per instance, also turn on Vercel's firewall rate limiting for `/api/auth/*`.
- [ ] **Security headers.** `next.config.ts` sets none. Add `headers()` with at least: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `Permissions-Policy`, and a Content-Security-Policy (start in report-only). Set `poweredByHeader: false`.
- [ ] **Least privilege for API keys.** `GET /api/employees` with an API key returns the full employee row (salary `monthlyCost`, `notes`, targets) via `...e` (`app/api/employees/route.ts:17`). The time-tracking app only needs `id`, `name`, `active`. Return a minimal projection when `principal.kind === 'apiKey'`. Do the same check on `GET /api/clients` (revenue).
- [ ] **Upgrade vulnerable dependencies.** `npm audit --omit=dev` (Oct 2026) reports 1 critical and 11 high: `next@16.2.1` has a **critical** advisory, fixed in `next@16.4.0` (bump `eslint-config-next` with it); `fast-xml-parser` (VAT module) is high with a fix available; `prisma` is flagged through a transitive dependency, so check the advisory before acting. Then turn on Dependabot.
- [ ] **CSV formula injection.** `components/workforce/csv.ts:4` doesn't neutralise cells that start with `=`, `+`, `-`, `@`, tab or CR. An employee/client name such as `=HYPERLINK(...)` (which can come in through the API) runs as a formula when a manager opens the export in Excel. Prefix such strings with `'`.

### P1
- [ ] **Account enumeration.** Signup returns `409 An account with this email already exists` (`app/api/auth/signup/route.ts:22`). Combined with no rate limit, this lists your customers' emails. Return a generic response (or rate-limit hard).
- [ ] **Input size limits.** No max length on employee/client `name`/`notes`, entry `notes`/`workType`, or passwords (scrypt on a multi-MB password burns CPU). No cap on batch size in `POST /api/entries` (`app/api/entries/route.ts:118`). Suggested: name ≤ 120, notes ≤ 2 000, password ≤ 256, batch ≤ 1 000 entries, and reject request bodies over ~1 MB.
- [ ] **Session tokens stored in plaintext.** `lib/auth.ts:30` stores the raw token; a DB leak (backup, Turso token) means live sessions. Store `sha256(token)` like API keys already do. 30-day TTL with no idle timeout (`lib/auth.ts:9`): consider 7-day idle / 30-day absolute.
- [ ] **"Sign out everywhere"** button in Settings (today only a password change does it).
- [ ] **Password reset flow.** None exists. A customer who forgets a password needs a manual DB edit. Needs email delivery: reset token (hashed, 30-min expiry, single use).
- [ ] **Email verification on signup** (signup is open to anyone today).

### P2
- [ ] **CSRF defence in depth.** `SameSite=Lax` + JSON bodies already block the classic attacks, but `readJson` doesn't check `Content-Type`. Add an `Origin`/`Sec-Fetch-Site` check on mutating `/api/*` routes.
- [ ] **API key scopes and expiry** (today a key can read all employees/clients and write entries forever).
- [ ] **Audit log** for who changed salaries, targets and entries (useful for disputes with employees, and as GDPR accountability evidence).
- [ ] **2FA** for manager accounts (they hold salary data).
- [ ] **Roles.** One login per workspace, so a firm with several managers will share a password. Either document "one owner per workspace" for v1, or add team members with roles (owner / manager / read-only).

---

## 2. GDPR / privacy

**The roles.** The customer (accounting firm / SME) is the **controller** of its employees' data. Axion is the **processor** (Art. 28). The data is employees' names, salary cost, free-text notes, and day-by-day working time per client, which amounts to **monitoring of employee performance**. Employee data gets extra scrutiny in Greece (Law 4624/2019 art. 27, Hellenic DPA guidance on employee monitoring).

### P0
- [ ] **Remove or substantiate the "GDPR compliant" badge** on the landing page (`lib/dictionaries/en.ts:56`, `el.ts:54`). It's a public claim; today there's no privacy policy, DPA or erasure flow behind it. Same for "AI-powered … models trained on real invoice activity" (`en.ts:58`): the VAT forecast is rule-based.
- [ ] **Privacy Policy, Terms and Cookie notice pages.** The footer links are `href="#"` (`components/axion/Footer.tsx:33,51,70`). Publish real pages (EL + EN) and link them from the signup form.
- [ ] **Data Processing Agreement (Art. 28)** that customers accept at signup or contract, with an annex listing **sub-processors** (Vercel, Turso, AWS for invoice PDFs, any email provider) and their locations / transfer mechanism (EU-US DPF or SCCs).
- [ ] **Confirm the database region is in the EU.** `vercel.json` pins functions to Dublin, but the Turso database region isn't in the repo. Check it in the Turso dashboard; if it's not EU, migrate before delivery.
- [ ] **Account deletion (erasure).** No endpoint deletes a user. The schema already cascades every domain table on `User` delete, so this is mostly one `DELETE /api/account` route (re-auth with password) plus a Settings button. Define what happens to backups (they age out within X days).
- [ ] **Employee erasure / anonymisation.** An employee with logged work can't be deleted (`app/api/employees/[id]/route.ts:97`, by design, to keep history). Add an **"Anonymise"** action: replace the name with `Employee #N` and clear the notes, while keeping hours and cost figures (needed for historical reports, and no longer tied to a person once the name is gone). That lets the controller honour an ex-employee's erasure request without breaking reports.
- [ ] **Data export (access / portability, Art. 15/20).** Add a workspace export (JSON/CSV of employees, clients, entries, settings) and a **per-employee export** so the controller can answer an employee's access request.
- [ ] **Free-text notes warning.** Employee and entry `notes` are free text. Add helper text ("Don't record health, union or other sensitive data here") in `components/dashboard/EmployeeEditPanel.tsx`, and mention it in the DPA/customer guidance. Special-category data (Art. 9) would change the risk profile completely.

### P1
- [ ] **Retention policy.** Work entries are kept forever. Decide a default (e.g. statutory retention + 1 year) and/or let the customer configure it. Purge expired `Session` rows (today they're only deleted when the same token is presented again).
- [ ] **Records of processing (Art. 30(2))** as processor: categories of data, sub-processors, transfers, security measures. Mostly a document; this checklist feeds it.
- [ ] **Breach procedure.** Who gets alerted, how you notify controllers "without undue delay" (Art. 33(2)), and a contact address (e.g. `privacy@…`).
- [ ] **Customer guidance pack** (a short PDF for controllers): template notice to employees about time tracking, the purpose, and whether a **DPIA** is needed. Systematic monitoring of employees usually meets the EDPB's DPIA criteria, and many customers will ask you for input.
- [ ] **Lead form.** The landing page form collects name, email, phone and company, shows "Thank you", but **sends nothing** (`components/axion/LeadForm.tsx:37`). Wire it to a backend and add a privacy notice link under it. Today leads are silently lost.
- [ ] **Logging hygiene.** Make sure server logs (Vercel) don't capture request bodies with names/salaries. `app/api/invoices/upload-url/route.ts` logs filenames (not MyEmployee, same policy).

### P2
- [ ] **Encryption/backups statement.** Confirm and document Turso encryption at rest and backup/PITR retention (it goes in the DPA's security annex).
- [ ] **Profiling transparency.** Utilization, "days below target" and management alerts are evaluations of individual employees. They aren't automated decisions with legal effect (Art. 22), but say in the customer guidance that they're decision support, not automatic HR decisions.

---

## 3. Functional

### P0 (bugs a customer will notice in week one)
- [ ] **Month-to-date compared against a full previous month.** The default period is "1st of this month → now" (`lib/workforce.ts:81`), but `previousPeriodOf` (`lib/profitability.ts:121`) compares it with the **whole** previous month. On the 12th of the month every KPI shows about −60% (seen on the seeded overview: revenue −61%, labour cost −60%). Compare like-for-like (same day-count of the previous month), or label the delta "vs. full previous month".
- [ ] **Dates and time zones.** Entries are bucketed by UTC day/month. A time-tracking app that sends `2026-10-01T00:30:00+03:00` lands on **30 Sep** in UTC. Either require plain `YYYY-MM-DD` dates in the API contract (and reject datetimes), or convert to `Europe/Athens` before bucketing. Add a test for the month-boundary case.
- [ ] **Entry date sanity.** `new Date(input.date)` accepts any year (`app/api/entries/route.ts:34`). Reject dates more than ~1 day in the future or before e.g. 2000; one typo (`2062`) skews every chart.

### P1
- [ ] **Cost per hour is inconsistent between API and UI.** `GET /api/employees` computes `costPerHour` from the account-wide hours (`app/api/employees/route.ts:18`) and ignores the employee's `contractHoursPerMonth`, which the dashboards do use. Use the same helper everywhere.
- [ ] **Settings bounds.** `hoursPerDay`/`daysPerMonth` only check `> 0` (`app/api/settings/route.ts:26`). Cap them (≤ 24, ≤ 31).
- [ ] **Language.** The dashboard UI is Greek only (hard-coded strings) while the landing page and `/en` routes are bilingual. Either localise the dashboard or make `/en/dashboard` clearly Greek-only for v1. API error messages mix English and Greek (e.g. the password route).
- [ ] **API contract doc for the time-tracking app.** Endpoint list, auth header, `externalId` idempotency, batch limits, date format, error shapes. `scripts/smoke-apikey.mjs` is a start.
- [ ] **Empty states and onboarding.** Walk a brand-new account through: no employees → add employee → add client (with revenue) → create API key → first entry → overview shows data. Make sure each empty screen points to the next step (the overview already does).
- [ ] **Integration tests for API routes.** All 102 tests are unit tests on pure functions; nothing exercises auth or tenant isolation. Add tests that log in as user A and assert 404 on user B's employee/client/entry/merge, 401 without auth, and API-key-only access to ingestion.

### P2
- [ ] Partial-month revenue proration is correct but not obvious: the tooltip explains it, but consider a "month to date" chip on KPIs.
- [ ] `costPerHour`, `contribution` and `utilization` definitions written once in a help page (the UI tooltips are good; a single reference avoids support questions).
- [ ] Accessibility pass on the dashboard (keyboard focus on the chart hover targets, contrast of `text-blue-200/70` on the blue surface).

---

## 4. Release / operations

- [ ] **P0 Schema migrations are reproducible.** The Prisma migrations folder stops at `add_api_keys`. Later columns (`userId`, targets, contract hours) only exist as hand-run SQL in `scripts/*.sql`. Fold them into Prisma migrations (or one documented, ordered runbook) so a fresh environment can be built without guessing.
- [ ] **P0 Production env check:** `TURSO_*`, `AXION_ENCRYPTION_KEY` (≥ 32 random chars, stored only in Vercel), `NODE_ENV=production` (needed for the `Secure` cookie flag).
- [ ] **P2 Build needs S3 secrets.** `next build` fails unless `AWS_*` / `S3_BUCKET_NAME` are set, because `lib/s3.ts` reads them at import time (via `/api/invoices/upload-url`). Read them lazily so CI and preview builds don't need production secrets.
- [ ] **P1 Error monitoring + uptime** (e.g. Sentry with PII scrubbing, Vercel log drains, an uptime check on `/api/auth/me`).
- [ ] **P1 Backups:** confirm Turso point-in-time restore is on, and run one test restore.
- [ ] **P1 Clean up before handover:** decide which `scripts/` (smoke tests, Excel import, ad-hoc SQL) ship, and remove the step-by-step `console.log` calls in `app/api/invoices/upload-url/route.ts`.

---

## 5. Manual acceptance run (before handover)

1. Sign up → land on an empty overview → follow the empty-state links.
2. Add 3 employees (one with contract hours, one inactive) and 4 clients (one non-billable / overhead, one with planned hours).
3. Create an API key → POST a batch of entries with `externalId` → POST it again → the count doesn't change.
4. Check the overview, Employees, Clients, Client board, Entries pages for the current month, previous month, a custom range and "All".
5. Edit an entry, reassign it to another employee, delete it; totals update everywhere.
6. Try to delete an employee with entries → blocked, with a clear message → deactivate instead.
7. Merge two clients → entries move, source disappears.
8. Export CSV from the performance table → opens correctly in Excel (Greek characters, no formula execution).
9. Log in as a **second** account → none of the first account's data is reachable by URL or API.
10. Revoke the API key → ingestion returns 401.
11. Change password → other browser sessions are signed out.
12. On a phone (390 px): sidebar collapses to the top nav and tables scroll horizontally.
