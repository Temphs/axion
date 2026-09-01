"""Fair value from completed sales, with an explicit confidence flag.

The rule from the brief: fair value is the median of genuine completed
secondary-market transactions, not the floor. The floor only ever sets the
quick-sale number, and when the tape is too thin to speak, the number is marked
LOW so it is never mistaken for a traded price.

Every window x inclusion-set combination is computed here rather than in Excel,
so the Player Terminal switches between them with a lookup instead of an
array formula over thousands of rows.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pandas as pd

from ..settings import FAIR_VALUE_WINDOWS, INCLUSION_SETS

POSITION_KEYS = ["player_slug", "rarity", "season_class"]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def load_tape(connection) -> pd.DataFrame:
    tape = pd.read_sql_query(
        "SELECT player_slug, rarity, season_class, occurred_at, eur, sale_type, card_slug, source "
        "FROM price_obs",
        connection,
    )
    if tape.empty:
        return tape
    tape["occurred_at"] = pd.to_datetime(tape["occurred_at"], utc=True, errors="coerce")
    tape = tape.dropna(subset=["occurred_at", "eur"])
    tape["season_class"] = tape["season_class"].fillna("UNKNOWN")
    return tape


def fair_value_grid(tape: pd.DataFrame) -> pd.DataFrame:
    """One row per position x window x inclusion set."""
    columns = POSITION_KEYS + [
        "window_days", "inclusion_set", "sales", "median_eur", "mean_eur", "min_eur", "max_eur",
    ]
    if tape.empty:
        return pd.DataFrame(columns=columns)

    now = _now()
    frames = []
    for window in FAIR_VALUE_WINDOWS:
        cutoff = now - timedelta(days=window)
        in_window = tape[tape["occurred_at"] >= cutoff]
        for set_name, types in INCLUSION_SETS.items():
            subset = in_window[in_window["sale_type"].isin(types)]
            if subset.empty:
                continue
            grouped = (
                subset.groupby(POSITION_KEYS)["eur"]
                .agg(sales="count", median_eur="median", mean_eur="mean", min_eur="min", max_eur="max")
                .reset_index()
            )
            grouped["window_days"] = window
            grouped["inclusion_set"] = set_name
            frames.append(grouped)

    if not frames:
        return pd.DataFrame(columns=columns)
    grid = pd.concat(frames, ignore_index=True)
    for column in ("median_eur", "mean_eur", "min_eur", "max_eur"):
        grid[column] = grid[column].round(2)
    return grid[columns]


def latest_floors(connection) -> pd.DataFrame:
    floors = pd.read_sql_query(
        "SELECT f.player_slug, f.rarity, f.season_class, f.floor_eur, f.listing_count, f.observed_at "
        "FROM floor_snap f JOIN (SELECT player_slug, rarity, season_class, MAX(observed_at) AS latest "
        "FROM floor_snap GROUP BY player_slug, rarity, season_class) m "
        "ON f.player_slug = m.player_slug AND f.rarity = m.rarity "
        "AND IFNULL(f.season_class,'') = IFNULL(m.season_class,'') AND f.observed_at = m.latest",
        connection,
    )
    if floors.empty:
        return pd.DataFrame(columns=POSITION_KEYS + ["floor_eur", "listing_count", "observed_at"])
    floors["season_class"] = floors["season_class"].fillna("UNKNOWN")
    return floors


def resolve_fair_value(
    positions: pd.DataFrame,
    grid: pd.DataFrame,
    floors: pd.DataFrame,
    settings: dict,
) -> pd.DataFrame:
    """Attach fair value, floor, quick-sale price and a confidence flag."""
    valuation = settings["valuation"]
    window = int(valuation["fair_value_window_days"])
    inclusion = valuation.get("inclusion_set_name", "SECONDARY")
    minimum_sales = int(valuation["min_sales_for_fair_value"])
    statistic = "median_eur" if valuation["fair_value_statistic"] == "median" else "mean_eur"
    discount = float(valuation["quick_sale_discount"])
    haircut = float(valuation["floor_fallback_haircut"])

    result = positions.copy()
    chosen = grid[(grid["window_days"] == window) & (grid["inclusion_set"] == inclusion)]
    result = result.merge(
        chosen[POSITION_KEYS + ["sales", statistic]].rename(
            columns={statistic: "fair_value_eur", "sales": "fair_value_sales"}
        ),
        on=POSITION_KEYS,
        how="left",
    )

    # Wider net as a second chance: same window, all market venues.
    wider = grid[(grid["window_days"] == window) & (grid["inclusion_set"] == "MARKET")]
    result = result.merge(
        wider[POSITION_KEYS + ["sales", statistic]].rename(
            columns={statistic: "fallback_value_eur", "sales": "fallback_sales"}
        ),
        on=POSITION_KEYS,
        how="left",
    )
    result = result.merge(floors[POSITION_KEYS + ["floor_eur", "listing_count"]], on=POSITION_KEYS, how="left")

    def resolve(row: pd.Series) -> pd.Series:
        if pd.notna(row.get("fair_value_eur")) and (row.get("fair_value_sales") or 0) >= minimum_sales:
            return pd.Series([row["fair_value_eur"], "HIGH", "secondary sales"])
        if pd.notna(row.get("fallback_value_eur")) and (row.get("fallback_sales") or 0) >= minimum_sales:
            return pd.Series([row["fallback_value_eur"], "MED", "all market sales"])
        if pd.notna(row.get("fair_value_eur")):
            return pd.Series([row["fair_value_eur"], "LOW", "thin tape"])
        if pd.notna(row.get("fallback_value_eur")):
            return pd.Series([row["fallback_value_eur"], "LOW", "thin tape"])
        if pd.notna(row.get("floor_eur")):
            return pd.Series([round(row["floor_eur"] * haircut, 2), "LOW", "floor-derived"])
        if pd.notna(row.get("avg_cost_eur")):
            return pd.Series([row["avg_cost_eur"], "NONE", "your cost, no market data"])
        return pd.Series([float("nan"), "NONE", "no data"])

    resolved = result.apply(resolve, axis=1)
    resolved.columns = ["value_per_card_eur", "confidence", "value_basis"]
    result = pd.concat([result, resolved], axis=1)

    # Quick sale follows the floor when there is one, because that is what you
    # would actually undercut; otherwise it discounts fair value.
    result["quick_sale_price_eur"] = (
        result["floor_eur"].fillna(result["value_per_card_eur"]) * (1 - discount)
    ).round(2)
    result["floor_premium_pct"] = (
        (result["floor_eur"] / result["value_per_card_eur"] - 1) * 100
    ).round(1)
    return result
