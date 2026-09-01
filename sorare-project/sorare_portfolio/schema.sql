-- Sorare portfolio terminal, local store. SQLite.
-- Facts are append-only and de-duplicated by natural key, so re-running the
-- updater (or running it hourly for a year) can never double-count anything.

PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS player (
    slug          TEXT PRIMARY KEY,
    display_name  TEXT,
    club_slug     TEXT,
    club_name     TEXT,
    league        TEXT,
    position      TEXT,
    age           INTEGER,
    l5_api        REAL,
    l15_api       REAL,
    appearances_api INTEGER,
    updated_at    TEXT
);

CREATE TABLE IF NOT EXISTS card (
    slug              TEXT PRIMARY KEY,
    asset_id          TEXT,
    player_slug       TEXT REFERENCES player(slug),
    rarity            TEXT,
    season_year       INTEGER,
    season_class      TEXT,     -- IN_SEASON | CLASSIC
    serial_number     INTEGER,
    positions         TEXT,
    xp                INTEGER,
    grade             INTEGER,
    acquired_at       TEXT,
    acquisition_eur   REAL,
    acquisition_type  TEXT,     -- AUCTION | INSTANT_BUY | MANAGER_SALE | ...
    owned             INTEGER NOT NULL DEFAULT 1,
    first_seen        TEXT,
    last_seen         TEXT
);
CREATE INDEX IF NOT EXISTS idx_card_player ON card(player_slug, rarity, season_class);

-- One row per transaction leg. `txn_key` is the natural key used for de-dup.
CREATE TABLE IF NOT EXISTS txn (
    txn_key        TEXT PRIMARY KEY,
    source_id      TEXT,
    occurred_at    TEXT NOT NULL,
    card_slug      TEXT,
    player_slug    TEXT,
    rarity         TEXT,
    season_year    INTEGER,
    season_class   TEXT,
    txn_type       TEXT NOT NULL,   -- AUCTION | INSTANT_BUY | MANAGER_SALE |
                                    -- ACCEPTED_BUY_OFFER | DIRECT_OFFER | REWARD
    side           TEXT NOT NULL,   -- BUY | SELL | RECEIVE
    quantity       INTEGER NOT NULL DEFAULT 1,
    eur            REAL,
    wei            TEXT,
    counterparty   TEXT,
    is_cash_trade  INTEGER NOT NULL DEFAULT 1,  -- 0 for card-for-card trades
    ingested_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_txn_card ON txn(card_slug);
CREATE INDEX IF NOT EXISTS idx_txn_time ON txn(occurred_at);

-- The accumulating market tape: completed public sales seen by any run.
CREATE TABLE IF NOT EXISTS price_obs (
    obs_key       TEXT PRIMARY KEY,
    player_slug   TEXT NOT NULL,
    rarity        TEXT NOT NULL,
    season_year   INTEGER,
    season_class  TEXT,
    occurred_at   TEXT NOT NULL,
    eur           REAL NOT NULL,
    wei           TEXT,
    sale_type     TEXT NOT NULL,
    card_slug     TEXT,
    source        TEXT,
    first_seen    TEXT
);
CREATE INDEX IF NOT EXISTS idx_price_position ON price_obs(player_slug, rarity, season_class, occurred_at);

-- Live listings, snapshotted each run, so floors have history too.
CREATE TABLE IF NOT EXISTS floor_snap (
    snap_key      TEXT PRIMARY KEY,
    player_slug   TEXT NOT NULL,
    rarity        TEXT NOT NULL,
    season_class  TEXT,
    observed_at   TEXT NOT NULL,
    floor_eur     REAL,
    listing_count INTEGER
);
CREATE INDEX IF NOT EXISTS idx_floor_position ON floor_snap(player_slug, rarity, season_class, observed_at);

CREATE TABLE IF NOT EXISTS player_score (
    score_key    TEXT PRIMARY KEY,
    player_slug  TEXT NOT NULL,
    played_at    TEXT,
    competition  TEXT,
    score        REAL,
    minutes      INTEGER,
    started      INTEGER,
    opponent     TEXT
);
CREATE INDEX IF NOT EXISTS idx_score_player ON player_score(player_slug, played_at);

CREATE TABLE IF NOT EXISTS reward (
    reward_key      TEXT PRIMARY KEY,
    received_at     TEXT,
    gameweek        TEXT,
    competition     TEXT,
    lineup          TEXT,
    scarcity        TEXT,
    cash_eur        REAL DEFAULT 0,
    card_slug       TEXT,
    card_value_at_receipt REAL,
    essence_amount  REAL DEFAULT 0,
    essence_scarcity TEXT,
    xp_amount       REAL DEFAULT 0,
    source          TEXT
);

CREATE TABLE IF NOT EXISTS essence_event (
    event_key     TEXT PRIMARY KEY,
    occurred_on   TEXT,
    direction     TEXT,     -- EARN | SPEND
    source        TEXT,
    scarcity      TEXT,     -- LIMITED | RARE
    flavor        TEXT,
    amount        REAL,
    craft_type    TEXT,
    base_cost     REAL,
    clue_cost     REAL,
    draw_type     TEXT,
    card_slug     TEXT,
    card_tier     TEXT,
    card_value    REAL,
    notes         TEXT
);

CREATE TABLE IF NOT EXISTS cash_flow (
    flow_key    TEXT PRIMARY KEY,
    occurred_on TEXT,
    direction   TEXT,   -- DEPOSIT | WITHDRAWAL
    amount_eur  REAL,
    method      TEXT,
    notes       TEXT
);

CREATE TABLE IF NOT EXISTS investment (
    investment_key TEXT PRIMARY KEY,
    player_slug    TEXT,
    player_name    TEXT,
    rarity         TEXT,
    quantity       REAL,
    avg_entry      REAL,
    target_price   REAL,
    downside_price REAL,
    thesis         TEXT,
    catalyst       TEXT,
    catalyst_date  TEXT,
    status         TEXT,
    bear_prob REAL, bear_price REAL,
    base_prob REAL, base_price REAL,
    bull_prob REAL, bull_price REAL,
    extreme_prob REAL, extreme_price REAL,
    notes          TEXT
);

-- One row per updater run: this is what makes NAV-over-time possible, because
-- Sorare exposes no portfolio history.
CREATE TABLE IF NOT EXISTS portfolio_snapshot (
    taken_at            TEXT PRIMARY KEY,
    cash_eur            REAL,
    cards_owned         INTEGER,
    acquisition_cost    REAL,
    market_value        REAL,
    quick_sale_value    REAL,
    nav                 REAL,
    unrealized_pl       REAL,
    realized_pl         REAL,
    deposits            REAL,
    withdrawals         REAL,
    economic_pl         REAL,
    rewards_total       REAL
);

CREATE TABLE IF NOT EXISTS refresh_log (
    run_id      TEXT,
    module      TEXT,
    started_at  TEXT,
    finished_at TEXT,
    rows_added  INTEGER,
    api_calls   INTEGER,
    status      TEXT,
    message     TEXT
);

CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
);
