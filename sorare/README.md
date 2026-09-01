# Sorare Portfolio Terminal

A portfolio and trading terminal for Sorare Football, built as an Excel workbook
on top of a local database that a Python updater keeps current.

**The loop you actually use:**

1. Double-click **`update_sorare.bat`**
2. Open **`workbook\Sorare_Portfolio.xlsx`**
3. Use the dashboard

That's it. You never type in a card, a purchase price, or a sale.

---

## What it gives you

| Sheet | What is on it |
|---|---|
| **Dashboard** | Deposits, cash, cost, market value, quick-sale value, realised and unrealised P/L, rewards, Essence, withdrawals, NAV, true economic P/L, ROI, reward yield - plus NAV over time, deposits vs value, cumulative rewards, allocation by scarcity / season / club / league, and your largest exposures. |
| **Holdings** | One row per Player + Scarcity + Season class: cards owned, weighted average cost, floor, fair value, quick-sale price, unrealised P/L in EUR and %, L5/L10/L40, starter %, and a confidence flag on every valuation. |
| **Player Terminal** | Pick a position and see floor, quick-sale, 24h/7d/30d/90d averages and medians, transaction counts, your cost and P/L - over a scatter chart of individual completed sales you can filter by sale type. |
| **Liquidity** | Sales in 24h / 7d / 30d, average daily sales, your share of recent volume, estimated days to liquidate (and a conservative version), and a High/Medium/Low band. |
| **Transactions** | Every buy and sell, typed as Auction / Instant Buy / Manager Sale / Accepted Buy Offer / Direct Offer, with closed trades and their realised P/L alongside. |
| **Rewards** | Cash, reward cards and Essence kept strictly apart, by competition, scarcity and month. |
| **Essence** | Your Limited and Rare ledger, crafts by draw type, and your own empirical EUR per 1,000 Essence. |
| **Investments** | Thesis, catalyst, four probability-weighted scenarios, expected price, expected profit and risk/reward. |
| **Price History** | The last 180 days of completed sales for everything you hold. |
| **Settings** | Every assumption, in amber cells. Change one, save, run the updater. |
| **Raw Data** | Which dataset feeds which sheet, and how much of it there is. |

---

## Setup on Windows 11 (about ten minutes, no programming needed)

### 1. Install Python

Download Python from <https://www.python.org/downloads/>. On the very first
screen of the installer, tick **"Add python.exe to PATH"**, then click Install.

### 2. Put this folder somewhere sensible

For example `C:\Sorare\`. Avoid OneDrive-synced folders: OneDrive locks files
while it uploads, and the updater writes to this folder constantly.

### 3. Run `setup.bat`

Double-click it. It builds a private Python environment inside the folder,
installs what it needs, and creates a `.env` file for your login. It does not
touch anything else on your PC.

### 4. Fill in `.env`

Right-click `.env` -> Open with -> Notepad:

```
SORARE_EMAIL=you@example.com
SORARE_PASSWORD=your-sorare-password
SORARE_JWT_AUD=sorare-portfolio-terminal
SORARE_API_KEY=
```

Your password is never stored and never sent as text: it is hashed on your PC
with the salt Sorare publishes for your account, exactly as Sorare's own login
does. What gets saved is a 30-day access token in `data\auth_token.json`.
`.env` is excluded from version control.

**Get an API key** (30 seconds, free, strongly recommended): go to
<https://sorare.com/settings/developer>, create one, paste it after
`SORARE_API_KEY=`. It lifts the rate limit from 60 to 200 calls a minute, which
is the difference between a two-minute update and a ten-minute one.

### 5. Run the schema check once

Download Sorare's schema (a public file, no login):

- open <https://api.sorare.com/graphql/schema> in your browser
- save it as `config\schema.graphql` inside this folder

Then run `update_sorare.bat doctor`. It checks every query this project uses
against the real schema, prints OK / PARTIAL / FAILED per query, and lists the
real field names for the areas Sorare does not document. Anything it cannot find
is switched off automatically - the rest keeps working.

### 6. Run `update_sorare.bat`

The first run signs you in (if 2FA is on, it asks for the code once), pulls your
gallery and transaction history, starts the price tape, and builds the workbook.
Expect a few minutes on the first run and well under a minute afterwards.

Then open `workbook\Sorare_Portfolio.xlsx`.

> Want to look before connecting anything? Run `update_sorare.bat demo` for a
> workbook full of realistic sample data.

---

## Keeping it current

### The important part: run it often

Sorare's `tokenPrices` returns only the **most recent handful of sales** per
player and rarity. No single call can give you a 30- or 90-day history, so this
project **accumulates** the tape: each run stores the sales it has not seen
before. Run it hourly and you capture nearly every print for the players you
hold. Run it once a week and your medians will be thin.

The same is true of NAV history: Sorare has no portfolio history to backfill, so
the "over time" charts start the day you start running the updater.

### Schedule it (Windows Task Scheduler)

1. Press Start, type **Task Scheduler**, open it.
2. **Create Task** (not "Basic Task").
3. *General*: name it `Sorare update`. Tick **Run whether user is logged on or
   not** and **Run with highest privileges** is not needed.
4. *Triggers* -> New: **Daily**, then tick **Repeat task every: 1 hour** for a
   duration of **1 day**.
5. *Actions* -> New: **Start a program**, Program:
   `C:\Sorare\update_sorare_scheduled.bat`, Start in: `C:\Sorare`.
   (Use that file, not `update_sorare.bat` - it never waits for a keypress.)
6. *Conditions*: untick "Start the task only if the computer is on AC power" if
   you want it on a laptop on battery.
7. *Settings*: tick "Run task as soon as possible after a scheduled start is
   missed".

Every 30 days the token expires and a scheduled run will report an auth failure.
Run `update_sorare.bat` by hand once and it signs in again.

### Refresh All inside Excel (optional)

By default the updater rebuilds the workbook, so the file is already current
when you open it - no Refresh All needed. If you would rather refresh from
inside Excel, close Excel and run **`enable_refresh_all.bat`** once: it converts
every data block into a live Power Query table pointing at `data\exports`. From
then on the loop is: run the updater, open the workbook, press **Data > Refresh
All**.

One rule either way: **close the workbook before the updater rebuilds it**, or
the rebuild is skipped (it says so in the log, and nothing is lost).

---

## The numbers, defined

```
Quick-Sale Value   = floor x (1 - quick-sale discount)        default 5%
Sorare NAV         = cash balance + quick-sale gallery value
True Economic P/L  = NAV + total withdrawals - total deposits
Total ROI          = True Economic P/L / total deposits
Fair Value         = median of completed secondary-market sales in the window
Floor Premium      = floor / fair value - 1
Return From Cost   = fair value / your average cost - 1
Liquidation Days   = cards owned / average daily completed sales
Reward Yield       = total rewards / average capital invested
```

**Fair value is never the floor.** The floor is one manager's asking price; fair
value is what cards actually changed hands for. The default counts manager sales
and accepted buy offers only - auctions and instant buys are excluded, and you
can switch them on in Settings. When the tape is too thin to speak, the number
falls back to the floor and is flagged `LOW` on Holdings so you always know
which is which.

Reward cards are counted at their value **when you received them**; their later
appreciation is shown separately and never as cash. Card-for-card trades are
recorded but excluded from realised P/L - swapping two cards realises nothing.

---

## What you maintain by hand (three small files, in `manual\`)

Sorare's public API documents nothing for Essence, and no reliable feed for
fiat deposits and withdrawals, so those come from CSVs you can open in Excel:

- **`cash_flows.csv`** - your deposits and withdrawals. A handful of rows, and
  they unlock deposits, withdrawals, True Economic P/L and ROI.
- **`essence_log.csv`** - Essence earned, crafts, draw types. Fill in the card a
  craft produced and the workbook prices it for you.
- **`investments.csv`** - your theses and scenario probabilities.

Each file is created with its columns, one example row, and a note explaining
it. Delete the example row when you add your own.

---

## Where everything lives

```
sorare\
  update_sorare.bat            the daily double-click
  setup.bat                    one-time install
  enable_refresh_all.bat       optional: live Power Query tables
  .env                         your login (never shared, never committed)
  config\settings.yml          every assumption, mirrored on the Settings sheet
  config\schema.graphql        Sorare's schema, for the doctor
  data\sorare.db               the database: cards, transactions, the price tape
  data\exports\*.csv           the slim datasets Excel reads
  data\raw\                    gzipped API responses, 30-day retention
  data\logs\                   one log per day
  manual\                      the three files you maintain
  workbook\Sorare_Portfolio.xlsx
```

Excel never sees the whole database - only the exports - which is what keeps it
fast as the tape grows into the hundreds of thousands of rows.

---

## When something goes wrong

| What you see | What to do |
|---|---|
| `Authentication failed` | Run `update_sorare.bat` by hand; the 30-day token has expired, or 2FA needs a code. |
| A module says `FAILED` with an unknown-field error | Re-download the schema and run `update_sorare.bat doctor`. Sorare changes fields roughly monthly; the doctor prints the real signature to fix. |
| `The workbook is open in Excel` | Close Excel, run the updater again. |
| Holdings shows `LOW` confidence everywhere | The tape is still young. It fills in as the hourly runs accumulate sales. |
| Fair value looks wrong for one player | Open the Player Terminal, look at the individual prints, and switch sale types off until it reflects the market you would actually sell into. |

Full design notes, and exactly which Sorare fields are confirmed rather than
assumed, are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
