"""Build every dataset the workbook needs and write it to data/exports.

Excel never sees the full database. It sees these files, which are aggregated,
sorted and bounded - so a tape of a hundred thousand prints still refreshes in
seconds.
"""

from __future__ import annotations

import logging
from datetime import timedelta

import pandas as pd

from .. import db
from ..paths import EXPORT_DIR
from ..settings import inclusion_set_name, load_settings
from ..transform import essence as essence_transform
from ..transform import investments as investments_transform
from ..transform import liquidity as liquidity_transform
from ..transform import pnl, positions as positions_transform, valuation

log = logging.getLogger(__name__)

# How much of the tape the Player Terminal chart can draw per position.
CHART_POINTS_PER_POSITION = 150
TAPE_EXPORT_DAYS = 180


def position_key(frame: pd.DataFrame) -> pd.Series:
    return (
        frame["player_slug"].astype(str)
        + " | "
        + frame["rarity"].astype(str)
        + " | "
        + frame["season_class"].astype(str)
    )


def _write(frame: pd.DataFrame, name: str) -> int:
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    frame.to_csv(EXPORT_DIR / f"{name}.csv", index=False, encoding="utf-8")
    return len(frame)


def _chart_feed(tape: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """The completed-sales scatter, plus an index of where each position starts.

    Exported in one block, sorted by position then time, with a per-position
    rank. The workbook slices it with INDEX on the start row, which keeps the
    Player Terminal instant no matter how large the tape grows.
    """
    if tape.empty:
        columns = ["position_key", "rank", "occurred_at", "eur", "sale_type"]
        return pd.DataFrame(columns=columns), pd.DataFrame(columns=["position_key", "start_row", "count"])

    recent = tape[tape["occurred_at"] >= valuation._now() - timedelta(days=TAPE_EXPORT_DAYS)].copy()
    recent["position_key"] = position_key(recent)
    recent = recent.sort_values(["position_key", "occurred_at"])
    recent["rank"] = recent.groupby("position_key").cumcount() + 1

    # Keep the most recent N per position.
    counts = recent.groupby("position_key")["rank"].transform("max")
    recent = recent[recent["rank"] > (counts - CHART_POINTS_PER_POSITION)]
    recent["rank"] = recent.groupby("position_key").cumcount() + 1
    recent["occurred_at"] = recent["occurred_at"].dt.tz_localize(None)

    feed = recent[["position_key", "rank", "occurred_at", "eur", "sale_type"]].reset_index(drop=True)
    index = (
        feed.reset_index()
        .groupby("position_key")
        .agg(start_row=("index", "min"), count=("index", "count"))
        .reset_index()
    )
    # 1-based row offset inside the exported block.
    index["start_row"] = index["start_row"] + 1
    return feed, index


def _allocations(holdings: pd.DataFrame) -> pd.DataFrame:
    """Portfolio weight by every dimension the dashboard charts, in one table."""
    if holdings.empty:
        return pd.DataFrame(columns=["dimension", "label", "value_eur", "cards", "share_pct"])
    dimensions = {"scarcity": "rarity", "season": "season_class", "club": "club_name", "league": "league"}
    total = holdings["market_value_eur"].fillna(0).sum() or 1.0
    frames = []
    for dimension, column in dimensions.items():
        grouped = (
            holdings.assign(**{column: holdings[column].fillna("Unknown")})
            .groupby(column)
            .agg(value_eur=("market_value_eur", "sum"), cards=("cards_owned", "sum"))
            .reset_index()
            .rename(columns={column: "label"})
        )
        grouped.insert(0, "dimension", dimension)
        frames.append(grouped)
    allocations = pd.concat(frames, ignore_index=True)
    allocations["value_eur"] = allocations["value_eur"].round(2)
    allocations["share_pct"] = (allocations["value_eur"] / total * 100).round(1)
    return allocations.sort_values(["dimension", "value_eur"], ascending=[True, False])


def _top_exposures(holdings: pd.DataFrame, limit: int = 12) -> pd.DataFrame:
    if holdings.empty:
        return pd.DataFrame(columns=["player_name", "value_eur", "cards", "share_pct"])
    total = holdings["market_value_eur"].fillna(0).sum() or 1.0
    exposures = (
        holdings.groupby("player_name")
        .agg(value_eur=("market_value_eur", "sum"), cards=("cards_owned", "sum"))
        .reset_index()
        .sort_values("value_eur", ascending=False)
        .head(limit)
    )
    exposures["value_eur"] = exposures["value_eur"].round(2)
    exposures["share_pct"] = (exposures["value_eur"] / total * 100).round(1)
    return exposures


def _reward_summaries(rewards: pd.DataFrame) -> dict[str, pd.DataFrame]:
    columns = ["label", "cash_eur", "card_value_eur", "total_eur", "rewards"]
    if rewards.empty:
        empty = pd.DataFrame(columns=columns)
        return {"rewards_by_month": empty, "rewards_by_competition": empty, "rewards_by_scarcity": empty}

    frame = rewards.copy()
    frame["received_at"] = pd.to_datetime(frame["received_at"], utc=True, errors="coerce")
    frame["month"] = frame["received_at"].dt.strftime("%Y-%m")

    def summarise(column: str) -> pd.DataFrame:
        grouped = (
            frame.groupby(frame[column].fillna("Unknown"))
            .agg(cash_eur=("cash_eur", "sum"), card_value_eur=("card_value_at_receipt", "sum"),
                 rewards=("reward_key", "count"))
            .reset_index()
        )
        grouped.columns = ["label", "cash_eur", "card_value_eur", "rewards"]
        grouped["total_eur"] = (grouped["cash_eur"].fillna(0) + grouped["card_value_eur"].fillna(0)).round(2)
        return grouped[columns].sort_values("label")

    by_month = summarise("month")
    by_month["cumulative_eur"] = by_month["total_eur"].cumsum().round(2)
    return {
        "rewards_by_month": by_month,
        "rewards_by_competition": summarise("competition"),
        "rewards_by_scarcity": summarise("scarcity"),
    }


def export_all(connection) -> dict[str, int]:
    settings = load_settings()
    settings["valuation"]["inclusion_set_name"] = inclusion_set_name(
        settings["valuation"]["fair_value_included_types"]
    )

    tape = valuation.load_tape(connection)
    grid = valuation.fair_value_grid(tape)
    floors = valuation.latest_floors(connection)

    base_positions = positions_transform.build_positions(connection)
    if base_positions.empty:
        valued = base_positions
    else:
        valued = valuation.resolve_fair_value(base_positions, grid, floors, settings)
        valued = positions_transform.finalise(valued)

    transactions = pnl.load_transactions(connection)
    realised = pnl.realised_trades(transactions)
    rewards = pnl.rewards_table(connection, valued)
    headline = pnl.headline_numbers(connection, valued, realised, rewards, settings)
    pnl.write_snapshot(connection, headline)

    written: dict[str, int] = {}

    if not valued.empty:
        holdings = valued.copy()
        holdings.insert(0, "position_key", position_key(holdings))
        holdings = holdings.sort_values("market_value_eur", ascending=False)
        written["holdings"] = _write(holdings, "holdings")
        written["positions_list"] = _write(
            holdings[["position_key", "player_name", "rarity", "season_class", "cards_owned"]],
            "positions_list",
        )
    else:
        written["holdings"] = _write(pd.DataFrame(columns=["position_key"]), "holdings")
        written["positions_list"] = _write(pd.DataFrame(columns=["position_key"]), "positions_list")

    if not grid.empty:
        stats = grid.copy()
        stats.insert(0, "position_key", position_key(stats))
        stats["stat_key"] = (
            stats["position_key"] + " | " + stats["window_days"].astype(str) + "d | " + stats["inclusion_set"]
        )
        written["player_stats"] = _write(stats, "player_stats")
    else:
        written["player_stats"] = _write(pd.DataFrame(columns=["stat_key"]), "player_stats")

    liquidity = (
        liquidity_transform.liquidity_table(valued, tape, settings)
        if not valued.empty
        else pd.DataFrame(columns=["position_key"])
    )
    if not liquidity.empty:
        liquidity.insert(0, "position_key", position_key(liquidity))
    written["liquidity"] = _write(liquidity, "liquidity")

    if not transactions.empty:
        readable = transactions.copy()
        readable["occurred_at"] = readable["occurred_at"].dt.tz_localize(None)
        readable = readable.sort_values("occurred_at", ascending=False)
        written["transactions"] = _write(readable, "transactions")
    else:
        written["transactions"] = _write(transactions, "transactions")

    if not realised.empty:
        for column in ("bought_at", "sold_at"):
            realised[column] = pd.to_datetime(realised[column], utc=True, errors="coerce").dt.tz_localize(None)
    written["realised_trades"] = _write(realised, "realised_trades")

    written["rewards"] = _write(rewards, "rewards")
    for name, frame in _reward_summaries(rewards).items():
        written[name] = _write(frame, name)

    written["allocations"] = _write(_allocations(valued), "allocations")
    written["top_exposures"] = _write(_top_exposures(valued), "top_exposures")

    essence_tables = essence_transform.essence_tables(connection, valued)
    for name, frame in essence_tables.items():
        written[name] = _write(frame, name)

    written["investments"] = _write(investments_transform.investment_table(connection, valued), "investments")

    feed, index = _chart_feed(tape)
    written["price_tape"] = _write(feed, "price_tape")
    written["price_tape_index"] = _write(index, "price_tape_index")

    history = pd.read_sql_query("SELECT * FROM portfolio_snapshot ORDER BY taken_at", connection)
    written["nav_history"] = _write(history, "nav_history")

    written["kpis"] = _write(
        pd.DataFrame({"metric": list(headline.keys()), "value": list(headline.values())}), "kpis"
    )

    meta = pd.read_sql_query("SELECT key, value FROM meta", connection)
    refreshes = pd.read_sql_query(
        "SELECT module, MAX(finished_at) AS last_run, status FROM refresh_log GROUP BY module", connection
    )
    written["meta"] = _write(meta, "meta")
    written["refresh_log"] = _write(refreshes, "refresh_log")

    settings_rows = [
        {"setting": "quick_sale_discount", "value": settings["valuation"]["quick_sale_discount"]},
        {"setting": "fair_value_window_days", "value": settings["valuation"]["fair_value_window_days"]},
        {"setting": "fair_value_inclusion_set", "value": settings["valuation"]["inclusion_set_name"]},
        {"setting": "fair_value_statistic", "value": settings["valuation"]["fair_value_statistic"]},
        {"setting": "min_sales_for_fair_value", "value": settings["valuation"]["min_sales_for_fair_value"]},
        {"setting": "cash_balance_eur", "value": settings["account"]["cash_balance_eur"]},
        {"setting": "high_liquidity_min_daily_sales", "value": settings["liquidity"]["high_liquidity_min_daily_sales"]},
        {"setting": "medium_liquidity_min_daily_sales", "value": settings["liquidity"]["medium_liquidity_min_daily_sales"]},
        {"setting": "market_impact_warning_share", "value": settings["liquidity"]["market_impact_warning_share"]},
        {"setting": "assumed_eur_per_1000_limited", "value": settings["essence"]["assumed_eur_per_1000_limited"]},
        {"setting": "assumed_eur_per_1000_rare", "value": settings["essence"]["assumed_eur_per_1000_rare"]},
        {"setting": "last_export", "value": db.utcnow()},
    ]
    written["settings"] = _write(pd.DataFrame(settings_rows), "settings")

    log.info("Exported %d datasets to %s", len(written), EXPORT_DIR)
    return written
