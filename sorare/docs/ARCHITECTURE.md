# Sorare Portfolio Terminal — Architecture & Feasibility (read this before we build)

Status: **design proposal, Phase 0.** No production code written yet, on purpose.

---

## 0. What I could and could not verify from this machine

I inspected the official Sorare API documentation repository (`github.com/sorare/api`,
README + full CHANGELOG) rather than guessing from memory. Two hard constraints came out
of it, and both shape the design:

1. **GraphQL introspection is disabled** (changelog 2025-02-13). The schema is published as
   a single file at `https://api.sorare.com/graphql/schema`.
2. **This build environment is network-blocked from `api.sorare.com`** (the egress proxy
   answers `403` to CONNECT). I could not run a single live query or download the schema
   here.

Consequence: I will not hand you code that assumes field names I have not seen. Instead the
first thing we build is a **schema doctor** — you download `schema.graphql` on your PC (one
`curl`, or the browser), the doctor parses it, checks every field this project wants to use,
writes `config/schema_capabilities.json`, and prints a green/amber/red report. Every ingest
module reads that file and self-disables anything the schema does not actually offer, instead
of crashing at 3 a.m. inside a scheduled task.

That is the only honest way to build this without live access, and it is also what keeps the
project alive when Sorare deprecates a field (they do, roughly monthly, per the changelog).

---

## 1. Feasibility matrix — what Sorare actually gives us

**Confirmed** = I saw the exact field in Sorare's own README/examples/changelog.
**Probable** = the type exists in the changelog, exact sub-fields to be confirmed by the doctor.
**Unverified** = plausible but I refuse to promise it until the doctor sees it.
**Not exposed** = no trace in the public API docs; needs a fallback.

| # | Data you asked for | Verdict | Source / mechanism |
|---|---|---|---|
| 1 | Your full gallery, paginated | **Confirmed** | `user(slug:){ cards(after:$cursor){ nodes{...} pageInfo{ endCursor } } }`. Note: `paginatedCards` was **removed** — old scripts and blog posts using it are dead. |
| 2 | Card identity (rarity, season, serial, club, player, positions) | **Confirmed** | `anyCards(slugs:){ assetId slug rarityTyped seasonYear serialNumber anyPositions anyTeam{name} anyPlayer{displayName} }` |
| 3 | **What you paid for each card** | **Confirmed** | `card.tokenOwner { from amounts { wei } }` — the ownership record carries the acquisition price and date. This is the backbone of cost basis, and it means you do **not** type in hundreds of cards. |
| 4 | Your transaction history (auctions, offers) | **Probable** | `currentUser.tokenAuctions / wonTokenAuctions / lostTokenAuctions / boughtSingleSaleTokenOffers / soldSingleSaleTokenOffers / singleSaleTokenOffers / pendingTokenOffersSent / endedTokenOffersSent / …Received`. All named in the changelog as the live replacements for the removed `*EnglishAuctions` / `directOffers` fields. |
| 5 | Transaction type taxonomy | **Confirmed shape** | Your mapping is the right one: `TokenAuction`→Auction, `TokenPrimaryOffer`→Instant Buy, `SINGLE_SALE_OFFER`→Manager Sale, `SINGLE_BUY_OFFER`→Accepted Buy Offer, `DIRECT_OFFER`→Trade (`DIRECT_OFFER` is named explicitly in the changelog). Normalisation happens in Python, not in Excel. |
| 6 | Live floor / listings | **Confirmed** | `tokens.liveSingleSaleOffers(last:)` and `tokens.liveAuctions(last:)`. Floor = min live ask for player+rarity+season class, computed by us. |
| 7 | Completed-sale price history | **Confirmed but shallow** | `tokenPrices` returns **the last 5 public prices** (auction or single-sale offer) per player + rarity + collection. **This is the single most important limitation in the whole project** — see §2. |
| 8 | Price range per card | **Probable** | `Token.priceRange` (`Card.priceRange` was deprecated in favour of it). |
| 9 | Player scores L5 / L10 / L40, starter %, next opponent | **Unverified** | Sorare exposes So5 scores and appearances, but I have not seen the exact field names, and "L40" and "starter %" are SorareData-style derived metrics, not necessarily API primitives. Plan: doctor probes the player type; whatever exists we ingest, and we compute L5/L10/L40 ourselves from the per-match score list. If only per-match scores exist, that is enough — we derive the rest. |
| 10 | Cash balance | **Probable, changed recently** | `FiatWalletAccount` exists but `availableBalance` / `totalBalance` were **removed** from it, and balances are mid-migration from StarkEx to Base (changelog 2025-10-14). The doctor will find the current balance field; if it cannot, cash balance comes from the Settings sheet (one number you update when you care). |
| 11 | Deposits & withdrawals | **Unverified** | `PendingDeposit`, `MangopayWithdrawal`, `StarkwareWithdrawal` types exist; a complete historical fiat cash-flow feed is not documented. Fallback: `manual/cash_flows.csv` — you paste your deposit/withdrawal list **once** (that is a handful of rows, not hundreds), and everything downstream (True Economic P/L, ROI) works. |
| 12 | Rewards (gameweek, competition, cards, cash) | **Probable** | `football.so5.so5Reward`, `So5Leaderboard.rewardsConfig`, `RewardCard`. Reward *cards* are also detectable from the gallery: a card whose `tokenOwner.from` is a reward/mint event rather than a purchase. |
| 13 | **Essence** (Limited / Rare, crafting, draws) | **Not exposed** | Zero mentions of "essence" in Sorare's README **and** in the entire changelog. I will not fake a field for it. Fallback: a proper Essence ledger in `manual/essence_log.csv` with a template and validation, plus automatic valuation of the cards you receive (once you own a crafted card it appears in the gallery, so its market value is priced automatically). You type the craft, we price the outcome. |
| 14 | XP / level, collection bonus | **Unverified** | Doctor probes; if absent, the columns stay but empty rather than being faked. |

**Rate limits** (from the README, so we can size the updater): 20 calls/min unauthenticated,
60 authenticated, **200 with a free self-service API key** from `sorare.com/settings/developer`,
40 in-flight queries, `429` returns a `Retry-After` header we honour. Query **depth ≤ 12** and
**complexity ≤ 30 000** when authenticated — complexity is charged on the *requested* page size,
so we page in chunks and keep selections narrow. There is also a payload-size cap (`413`).

---

## 2. The one design decision that matters most: price history

`tokenPrices` gives the **last 5 sales** per player/rarity/collection. Nothing in the public API
gives you a 90-day tape retroactively. So:

- **90-day medians cannot exist on day one.** Anyone who promises you that is inventing it.
- The tape is **accumulated**: every updater run appends the newest completed sales it sees and
  de-duplicates on a natural key (`player + rarity + season class + price + timestamp`). Run
  hourly and you capture essentially everything for the players you track; run weekly and you
  will miss sales on liquid players.
- Therefore: **hourly Task Scheduler is not a nice-to-have, it is the data collection strategy.**
  Your 7d/30d/90d medians get better every day the machine runs.
- Day-one fallback so the dashboard is not empty: fair value falls back, in order, to
  (1) accumulated completed sales in the window → (2) `tokenPrices` last-5 median →
  (3) live floor × a haircut from Settings. Every number on the dashboard carries a
  **confidence flag** (`HIGH` / `MED` / `LOW — floor-derived`) so you never mistake a floor
  guess for a real trade print.

Same story for **portfolio value over time** and **NAV over time**: Sorare has no such history.
We snapshot NAV into a `portfolio_snapshot` table on every run, and the chart grows from your
first run forward. What *is* fully reconstructable retroactively is cost basis, realised P/L and
deposit/withdrawal history, because those come from your transaction record.

---

## 3. System architecture

```
                    ┌───────────────────────────────────────────────┐
   sorare.com ──────┤ 1. AUTH        bcrypt salt → signIn → JWT      │
   GraphQL API      │    2FA-aware, token cached 30d, 0600 perms     │
                    └───────────────────┬───────────────────────────┘
                                        │
                    ┌───────────────────▼───────────────────────────┐
                    │ 2. INGEST (Python, one module per domain)      │
                    │    gallery · transactions · prices · floors    │
                    │    scores · rewards                            │
                    │    rate-limited, resumable, incremental        │
                    └───────────────────┬───────────────────────────┘
                                        │ raw JSON (gzipped, 30d retention)
                    ┌───────────────────▼───────────────────────────┐
                    │ 3. SQLite  data/sorare.db   ← source of truth  │
                    │    append-only facts + refresh log             │
                    └───────────────────┬───────────────────────────┘
                                        │
                    ┌───────────────────▼───────────────────────────┐
                    │ 4. TRANSFORM (pandas)                         │
                    │    positions · WAC · realised P/L · fair value │
                    │    liquidity · rewards · essence · scenarios   │
                    └───────────────────┬───────────────────────────┘
                                        │ ~12 slim CSVs (thousands of rows, not millions)
                    ┌───────────────────▼───────────────────────────┐
                    │ 5. EXCEL   Power Query → tables → dashboard    │
                    └───────────────────────────────────────────────┘
```

**Why SQLite and not "Excel holds everything":** you said hundreds of cards and many thousands
of transactions. The price tape is the part that explodes (it grows forever). SQLite holds the
full tape; Excel only ever sees pre-aggregated exports — a Holdings CSV of ~200 rows, a
price-chart CSV limited to the tracked player window. The workbook stays under a few MB and
`Refresh All` stays under a few seconds. Full history is queryable in SQL whenever you want it.

**Why CSV between SQLite and Excel** rather than an ODBC/SQLite driver: no driver install, no
32/64-bit hell on Windows, and Power Query reads a folder of CSVs natively and fast. Parquet is
a possible upgrade later if the exports get big; CSV is the right default for a machine that
must "just work".

---

## 4. Folder structure

```
sorare/
├─ update_sorare.bat              ← the daily double-click
├─ build_workbook.bat             ← one-time (and after any layout change)
├─ setup.bat                      ← one-time: venv + dependencies
├─ requirements.txt
├─ .env.example                   → you copy to .env (git-ignored, never committed)
├─ config/
│  ├─ settings.yml                assumptions; mirrored into the Excel Settings sheet
│  └─ schema_capabilities.json    written by `doctor`, read by every ingest module
├─ sorare_portfolio/              the Python package
│  ├─ cli.py                      doctor · update · export · build-workbook · backfill
│  ├─ auth.py                     salt → bcrypt → signIn → JWT (+2FA), cached & chmod-restricted
│  ├─ client.py                   GraphQL client: token bucket, 429/Retry-After, retries, paging
│  ├─ queries/*.graphql           every query in its own file — reviewable, diffable, no f-strings
│  ├─ ingest/                     gallery · transactions · prices · floors · scores · rewards
│  ├─ transform/                  positions · valuation · liquidity · rewards · essence · scenarios
│  ├─ export/                     SQLite → data/exports/*.csv
│  └─ excel/                      openpyxl workbook builder + powerquery/*.m + setup_excel.ps1
├─ data/                          git-ignored
│  ├─ sorare.db                   the database
│  ├─ exports/*.csv               what Excel reads
│  ├─ raw/                        gzipped API responses (audit trail, 30-day retention)
│  └─ logs/update-YYYY-MM-DD.log
├─ manual/                        the only files you ever type into
│  ├─ cash_flows.csv              deposits / withdrawals
│  ├─ essence_log.csv             essence earned, crafts, draws
│  └─ investments.csv             thesis, catalyst, scenario probabilities
└─ workbook/
   └─ Sorare_Portfolio.xlsx       the deliverable
```

Secrets: `.env` holds `SORARE_EMAIL`, `SORARE_PASSWORD` (used only to compute the bcrypt hash
locally — never sent in clear, never written to disk), `SORARE_API_KEY`, `SORARE_JWT_AUD`.
`.env`, `data/` and `workbook/` go in `.gitignore`. No password ever reaches a script literal.

---

## 5. Database model (SQLite)

Append-only facts, derived views. Key tables:

| Table | Grain | Notes |
|---|---|---|
| `card` | one Sorare card | slug (PK), asset_id, player_slug, rarity, season_year, serial, in_season flag, acquired_at, acquisition_price_eur/wei, acquisition_type, still_owned |
| `player` | one player | slug (PK), display name, club, league, position, age/DOB |
| `txn` | one transaction leg | id (PK, natural key from API), ts, card_slug, type (5-way enum), side, qty, eur, wei, counterparty, source_object — **de-duplicated on insert, so re-running never double-counts** |
| `price_obs` | one completed sale | player+rarity+season_class, ts, price_eur, sale_type, source — the accumulating tape; unique index kills duplicates |
| `floor_snap` | one live-ask snapshot | player+rarity+season_class, ts, min_ask, n_listings |
| `player_score` | one match | player, fixture, score, minutes, started — L5/L10/L40 derived from this |
| `reward` | one reward line | gameweek, competition, lineup, scarcity, cash, card slug, essence, xp, value_at_receipt |
| `essence_event` | one earn/spend | date, source, scarcity, amount, craft type, clue costs, draw type, card received |
| `cash_flow` | one deposit/withdrawal | date, direction, amount, method |
| `investment` | one thesis | player+rarity, entry, target, downside, thesis, catalyst, 4 scenario prob/price pairs |
| `portfolio_snapshot` | one per run | ts, cash, gallery value, quick-sale value, NAV, unrealised, realised — **this is what makes the time-series charts possible** |
| `refresh_log` | one run | started/finished, module, rows added, errors, API calls used |

Positions (Player + Scarcity + Season) are a **view**, not a table — they are recomputed from
cards + txns every run, so a trade can never leave a stale position behind.

---

## 6. Workbook structure

Visible: **Dashboard · Holdings · Player Terminal · Liquidity · Transactions · Rewards ·
Essence · Investments · Settings**.
Hidden: `_data_*` (one per Power Query load), `_calc`, `_meta` (last refresh timestamp,
per-module freshness, confidence flags).

- Dark financial-terminal palette, one accent for positive / one for negative, no gridlines,
  frozen headers, KPI "cards" as merged-and-styled ranges, navigation buttons on every sheet.
- **Dashboard**: the 16 KPIs you listed, computed exactly as you defined them —
  `Quick-Sale = floor × (1 − discount)`, `NAV = cash + quick-sale gallery`,
  `True Economic P/L = NAV + withdrawals − deposits`, `ROI = P/L ÷ deposits`,
  with the discount and every threshold read live from **Settings**, never hard-coded in a formula.
  Charts: NAV over time, deposits vs value, cumulative rewards, realised vs unrealised,
  allocation by scarcity / in-season / club / league, top exposures.
- **Player Terminal**: dropdown (player × scarcity) driving a completed-sales scatter that plots
  *individual prints* colour-coded by sale type, with checkboxes to exclude auctions and instant
  buys from fair value, exactly as you asked. Fair value = median of the included prints in the
  chosen window; floor premium and return-from-cost sit next to it.
- **Liquidity**: sales counts 24h/7d/30d, average daily sales, your quantity as % of volume,
  estimated liquidation days (plus the conservative 5%-below-floor variant), High/Med/Low bands
  from Settings thresholds, and a flag when your stack is a meaningful share of the tape.
- **Refresh model**: Power Query queries are created programmatically by
  `setup_excel.ps1` (Excel's `Workbook.Queries.Add`) so you never hand-build a query. The export
  folder path lives in one Settings cell, so moving the project folder does not break anything.

One caveat I need your answer on: `FILTER`/`SORT`/`LET` make the Player Terminal dramatically
cleaner, but they need **Microsoft 365 / Office 2021+**. On 2019 I would build the same screens
with older array formulas and helper columns — same numbers, slightly more machinery.

---

## 7. Build order

- **Phase 1** — doctor, auth, client, gallery + transactions ingest, SQLite, positions/WAC/
  realised P/L, floors, exports, workbook builder, Dashboard + Holdings. *This is the point where
  the thing is already useful.*
- **Phase 2** — price tape accumulation, fair value engine with confidence flags, Player
  Terminal, Liquidity.
- **Phase 3** — rewards, essence ledger, scores → L5/L10/L40, investment/scenario tracker.
- **Phase 4** — `update_sorare.bat`, Task Scheduler recipe, incremental-only fetching,
  UI polish, error emails/log summary.

Each phase ends with a workbook you can actually open, not a half-wired skeleton.

## 8. Daily operating loop (the goal)

1. Task Scheduler runs `update_sorare.bat` hourly in the background (or you double-click it).
2. Open `Sorare_Portfolio.xlsx` → **Data ▸ Refresh All**.
3. Everything on every sheet is current, and `_meta` tells you exactly how fresh each module is
   and which numbers are floor-derived rather than trade-derived.

---

## 9. What was actually built, and where it differs from this plan

Three decisions changed once the code met reality. Each one is a deliberate
trade, not a shortcut.

**1. The workbook is rebuilt by the updater; Power Query is optional.**
The plan was Power Query first. In practice, creating Power Query connections
programmatically requires driving Excel itself through COM, which cannot be
tested from anywhere but a Windows machine with Excel installed. So the default
path is: the updater regenerates `Sorare_Portfolio.xlsx` from the exported CSVs
on every run, which makes the workbook already-current when you open it - one
step *fewer* than "press Refresh All". `enable_refresh_all.bat` converts every
data block into a live Power Query table for anyone who prefers refreshing from
inside Excel, and if that script fails, nothing is lost. The one cost of the
default: the workbook must be closed while the updater runs, and the updater
says so plainly in the log when it is not.

**2. No dynamic-array formulas, despite Excel 365 being available.**
`FILTER` and friends would make the Player Terminal shorter to write, but every
statistic they would compute is already computed in Python and exported as a
lookup table. Using INDEX/MATCH instead means the terminal is a handful of
lookups rather than array formulas scanning a tape of tens of thousands of rows,
it cannot half-spill, and it survives a Power Query refresh that resizes a table.

**3. Settings sync runs in both directions.**
The Settings sheet is the interface and `config/settings.yml` is the store. The
updater reads the sheet back into the YAML before it does anything else, so an
assumption changed in Excel is honoured by the very next run, and the comments in
the YAML file survive because values are rewritten line by line rather than
re-serialised.

### Still open, pending the schema doctor's first run on your machine

* **Player form (L5 / L10 / L40, starter %).** `queries/player_scores.graphql`
  contains best-guess field names, all marked optional. Run the doctor and read
  the `scores` line of its discovery report: it lists the real score-related
  field names in your schema. The transform already derives L5/L10/L40 and
  starter % from per-match scores as soon as anything populates `player_score`.
* **Rewards.** The `reward` table, sheet and charts are built and wired. What is
  missing is an ingest module, because the reward field names are undocumented -
  the doctor's `rewards` discovery line names them.
* **Cash balance and fiat cash flow.** Balance is a Settings cell; deposits and
  withdrawals come from `manual/cash_flows.csv`. If the doctor's `balances`
  discovery finds a usable field, that becomes a five-line ingest module.
* **Essence.** Nothing in Sorare's public API, so the ledger is manual by design.
  Everything downstream of it - EUR per 1,000, value by draw type, craft ROI -
  is built and works off that ledger.
