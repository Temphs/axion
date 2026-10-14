# MyEmployee — delivery checklist (security · GDPR · functional)

Built from a full read of the MyEmployee code on `main` (commit `d5b55f4`), plus a
local run with seeded data. Items ticked `[x]` were fixed on branch
`claude/sleepy-volta-ewsah5` and verified end to end against a running app. Every item names the file/line it comes from, so it
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
- [x] Unit tests pass (`npm test`: 13 files, 114 tests).

---

## 1. Security

### P0
- [x] **Rate-limit login and signup.** Neither route has any throttle, so passwords can be brute-forced and accounts mass-created. Reuse `lib/rateLimit.ts` (already used for password change): e.g. 10 attempts / 15 min per IP + per email on `app/api/auth/login/route.ts:14`, and per IP on signup. Because the limiter is per instance, also turn on Vercel's firewall rate limiting for `/api/auth/*`.
  - ✅ Done: per IP (20/15 min) + per email (10/15 min) on login, 5/hour per IP on signup. The limiter is still per instance, so also turn on the Vercel firewall rule for `/api/auth/*`.
- [x] **Security headers.** `next.config.ts` sets none. Add `headers()` with at least: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `Permissions-Policy`, and a Content-Security-Policy (start in report-only). Set `poweredByHeader: false`.
  - ✅ Done in `next.config.ts`: CSP (still needs `unsafe-inline` for scripts, since Next injects inline bootstrap scripts into the static pages), HSTS, nosniff, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, COOP, `no-store` on `/api/*`, `poweredByHeader: false`.
- [x] **Least privilege for API keys.** `GET /api/employees` with an API key returns the full employee row (salary `monthlyCost`, `notes`, targets) via `...e` (`app/api/employees/route.ts:17`). The time-tracking app only needs `id`, `name`, `active`. Return a minimal projection when `principal.kind === 'apiKey'`. Do the same check on `GET /api/clients` (revenue).
  - ✅ Done: API keys get `id, name, active` for employees and `id, name, active, billable` for clients.
- [x] **Upgrade vulnerable dependencies.** `npm audit --omit=dev` (Oct 2026) reports 1 critical and 11 high: `next@16.2.1` has a **critical** advisory, fixed in `next@16.4.0` (bump `eslint-config-next` with it); `fast-xml-parser` (VAT module) is high with a fix available; `prisma` is flagged through a transitive dependency, so check the advisory before acting. Then turn on Dependabot.
  - ✅ Done: `next@16.4.0` (critical fixed), `fast-xml-parser@5.11`. **Still open:** 7 high / 4 moderate, all inside the Prisma CLI tooling (`@prisma/dev`, `@prisma/config` and their dependencies); npm's only fix is a breaking downgrade to Prisma 6. Re-check when Prisma 7 ships a patch. `lib/package.json` is a stale copy of `package.json` (still pinning `next@16.2.1`) that dependency scanners will flag: delete it.
- [x] **CSV formula injection.** `components/workforce/csv.ts:4` doesn't neutralise cells that start with `=`, `+`, `-`, `@`, tab or CR. An employee/client name such as `=HYPERLINK(...)` (which can come in through the API) runs as a formula when a manager opens the export in Excel. Prefix such strings with `'`.
  - ✅ Done: `csvCell` prefixes `= + - @ tab CR` with `'` (tested in `tests/csv.test.ts`).

### P1
- [ ] **Account enumeration.** Signup returns `409 An account with this email already exists` (`app/api/auth/signup/route.ts:22`). Combined with no rate limit, this lists your customers' emails. Return a generic response (or rate-limit hard).
- [x] **Input size limits.** No max length on employee/client `name`/`notes`, entry `notes`/`workType`, or passwords (scrypt on a multi-MB password burns CPU). No cap on batch size in `POST /api/entries` (`app/api/entries/route.ts:118`). Suggested: name ≤ 120, notes ≤ 2 000, password ≤ 256, batch ≤ 1 000 entries, and reject request bodies over ~1 MB.
  - ✅ Done: name ≤ 120, notes ≤ 2 000, workType ≤ 120, externalId ≤ 200, password ≤ 256, batch ≤ 1 000 (413 above), one entry ≤ 24 h.
- [ ] **Session tokens stored in plaintext.** `lib/auth.ts:30` stores the raw token; a DB leak (backup, Turso token) means live sessions. Store `sha256(token)` like API keys already do. 30-day TTL with no idle timeout (`lib/auth.ts:9`): consider 7-day idle / 30-day absolute.
- [ ] **"Sign out everywhere"** button in Settings (today only a password change does it).
- [x] **Password reset flow.** None exists. A customer who forgets a password needs a manual DB edit. Needs email delivery: reset token (hashed, 30-min expiry, single use).
  - ✅ Done: `/[lang]/forgot-password` and `/[lang]/reset-password`, "Ξεχάσατε τον κωδικό;" link on login. Tokens are 256-bit, stored as SHA-256, single-use, 30-min expiry, newest link only; same response whether or not the email exists (the work runs after the response); per-IP and per-email rate limits; links built from `APP_URL` only; all sessions signed out on reset. **To go live:** run `scripts/add-password-reset.sql` on Turso, set `APP_URL`, `RESEND_API_KEY` and `EMAIL_FROM` (verified sender domain) in Vercel.
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
- [x] **Confirm the database region is in the EU.** `vercel.json` pins functions to Dublin, but the Turso database region isn't in the repo. Check it in the Turso dashboard; if it's not EU, migrate before delivery.
  - ✅ Confirmed by the owner: the Turso database is in Ireland (EU), matching the Vercel functions in Dublin (`dub1`).
- [x] **Account deletion (erasure).** No endpoint deletes a user. The schema already cascades every domain table on `User` delete, so this is mostly one `DELETE /api/account` route (re-auth with password) plus a Settings button. Define what happens to backups (they age out within X days).
  - ✅ Done: Settings → "Δεδομένα & απόρρητο" → delete account (needs the password). `DELETE /api/account` removes every row of the workspace. Not covered: PDFs uploaded through `/api/invoices/upload-url` (S3 + raw `invoices` table), which the UI doesn't use yet. Still to define: how long backups keep deleted data.
- [x] **Employee erasure / anonymisation.** An employee with logged work can't be deleted (`app/api/employees/[id]/route.ts:97`, by design, to keep history). Add an **"Anonymise"** action: replace the name with `Employee #N` and clear the notes, while keeping hours and cost figures (needed for historical reports, and no longer tied to a person once the name is gone). That lets the controller honour an ex-employee's erasure request without breaking reports.
  - ✅ Done: "Ανωνυμοποίηση" in the employee panel (`POST /api/employees/[id]/anonymize`). It replaces the name with `Anonymised #…`, clears the employee's and their entries' notes and targets, and deactivates them; hours and cost stay.
- [x] **Data export (access / portability, Art. 15/20).** Add a workspace export (JSON/CSV of employees, clients, entries, settings) and a **per-employee export** so the controller can answer an employee's access request.
  - ✅ Done: workspace JSON export in Settings (`GET /api/account/export`, no secrets) and per-employee JSON export in the employee panel (`GET /api/employees/[id]/export`).
- [x] **Free-text notes warning.** Employee and entry `notes` are free text. Add helper text ("Don't record health, union or other sensitive data here") in `components/dashboard/EmployeeEditPanel.tsx`, and mention it in the DPA/customer guidance. Special-category data (Art. 9) would change the risk profile completely.
  - ✅ Done: hint under the notes fields in the employee create form and edit panel. Still to do: add the same guidance to the DPA/customer pack.

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
- [x] **Employee entry link shipped.** Temphs/axion#10 (built in September, never merged) is merged into this branch and hardened: text length caps and type checks, a write limit per link (120/hour), "today" and the 7-day correction window in Greek time, `no-referrer` + `noindex` on `/t/<token>`, tokens left out of data exports, anonymising revokes the link, hydration-safe link display. Before deploy run `scripts/add-employee-access-token.sql` on Turso. **Without that column the Employee queries fail and the whole dashboard breaks.**
- [x] **Correct password rejected at login.** Reported by the owner. Causes found and fixed:
  - ✅ Greek accented passwords hashed as raw bytes: a Mac/iPhone (decomposed `έ`) and Windows/Android (composed `έ`) produced different hashes for the same visible password. Passwords are now hashed in NFC, and older hashes are still accepted from either device (`lib/password.ts`, `tests/password.test.ts`).
  - ✅ Login form sent React state instead of the field contents, so a password manager's autofill could be ignored and an older typed value sent. It now reads the form fields on submit; added `autocomplete`/`name` attributes so managers save and fill the right fields.
  - ✅ No help for typing slips: Caps Lock and Greek-keyboard warnings, a show-password button, and a hint plus reset link on "wrong password".
  - ✅ Diagnosis: failed logins log `no_account` vs `bad_password` (with a pseudonymous email hash). Each Vercel deployment logs which database host it uses, and refuses to start without `TURSO_DATABASE_URL`. If logs show `no_account` for a known user, that deployment is reading a different database (e.g. Preview vs Production env vars).
- [x] **Month-to-date compared against a full previous month.** The default period is "1st of this month → now" (`lib/workforce.ts:81`), but `previousPeriodOf` (`lib/profitability.ts:121`) compares it with the **whole** previous month. On the 12th of the month every KPI shows about −60% (seen on the seeded overview: revenue −61%, labour cost −60%). Compare like-for-like (same day-count of the previous month), or label the delta "vs. full previous month".
  - ✅ Done: month-to-date now compares with the same days of the previous month (1–12 Oct vs 1–12 Sep). Tested in `tests/period-math.test.ts`.
- [x] **Dates and time zones.** Entries are bucketed by UTC day/month. A time-tracking app that sends `2026-10-01T00:30:00+03:00` lands on **30 Sep** in UTC. Either require plain `YYYY-MM-DD` dates in the API contract (and reject datetimes), or convert to `Europe/Athens` before bucketing. Add a test for the month-boundary case.
  - ✅ Done: `lib/entryDate.ts` stores every entry on its **Greek** calendar day. Plain `YYYY-MM-DD` dates and offset-less datetimes keep their date; timestamps with an offset are converted to Europe/Athens. Tested in `tests/entry-date.test.ts`.
- [x] **Entry date sanity.** `new Date(input.date)` accepts any year (`app/api/entries/route.ts:34`). Reject dates more than ~1 day in the future or before e.g. 2000; one typo (`2062`) skews every chart.
  - ✅ Done: rejects impossible dates, years before 2000 and anything more than one day ahead.

### P1
- [x] **Cost per hour is inconsistent between API and UI.** `GET /api/employees` computes `costPerHour` from the account-wide hours (`app/api/employees/route.ts:18`) and ignores the employee's `contractHoursPerMonth`, which the dashboards do use. Use the same helper everywhere.
  - ✅ Done: the API now uses the employee's contract hours, falling back to the account default.
- [x] **Settings bounds.** `hoursPerDay`/`daysPerMonth` only check `> 0` (`app/api/settings/route.ts:26`). Cap them (≤ 24, ≤ 31).
  - ✅ Done: ≤ 24 h/day, ≤ 31 days/month.
- [ ] **Language.** The dashboard UI is Greek only (hard-coded strings) while the landing page and `/en` routes are bilingual. Either localise the dashboard or make `/en/dashboard` clearly Greek-only for v1. API error messages mix English and Greek (e.g. the password route).
- [ ] **API contract doc for the time-tracking app.** Endpoint list, auth header, `externalId` idempotency, batch limits, date format, error shapes. `scripts/smoke-apikey.mjs` is a start.
- [ ] **Empty states and onboarding.** Walk a brand-new account through: no employees → add employee → add client (with revenue) → create API key → first entry → overview shows data. Make sure each empty screen points to the next step (the overview already does).
- [ ] **Integration tests for API routes.** All 114 tests are unit tests on pure functions; nothing exercises auth or tenant isolation in CI (it was checked by hand with an end-to-end script for this round of fixes). Add tests that log in as user A and assert 404 on user B's employee/client/entry/merge, 401 without auth, and API-key-only access to ingestion.

### P2
- [ ] Partial-month revenue proration is correct but not obvious: the tooltip explains it, but consider a "month to date" chip on KPIs.
- [ ] `costPerHour`, `contribution` and `utilization` definitions written once in a help page (the UI tooltips are good; a single reference avoids support questions).
- [ ] Accessibility pass on the dashboard (keyboard focus on the chart hover targets, contrast of `text-blue-200/70` on the blue surface).

---

## 4. Release / operations

- [ ] **P0 Schema migrations are reproducible.** The Prisma migrations folder stops at `add_api_keys`. Later columns (`userId`, targets, contract hours) only exist as hand-run SQL in `scripts/*.sql`. Fold them into Prisma migrations (or one documented, ordered runbook) so a fresh environment can be built without guessing.
- [ ] **P0 Apply `scripts/add-password-reset.sql` to Turso** (`node scripts/run-sql-file.mjs scripts/add-password-reset.sql`) before deploying this branch: without the table, "forgot password" fails silently.
- [ ] **P0 Production env check:** `APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM` (new, for password reset), `TURSO_*`, `AXION_ENCRYPTION_KEY` (≥ 32 random chars, stored only in Vercel), `NODE_ENV=production` (needed for the `Secure` cookie flag).
- [ ] **P2 Build needs S3 secrets.** `next build` fails unless `AWS_*` / `S3_BUCKET_NAME` are set, because `lib/s3.ts` reads them at import time (via `/api/invoices/upload-url`). Read them lazily so CI and preview builds don't need production secrets.
- [ ] **P1 Error monitoring + uptime** (e.g. Sentry with PII scrubbing, Vercel log drains, an uptime check on `/api/auth/me`).
  - ✅ Partly done: admin console at `/el/admin` (accounts in `ADMIN_EMAILS` only) records server and browser errors (grouped, scrubbed of emails and tokens), runs health checks with one-click safe fixes, and shows cookieless analytics. Still open: an external uptime check and push/email alerts (the console only shows alerts when opened).
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
