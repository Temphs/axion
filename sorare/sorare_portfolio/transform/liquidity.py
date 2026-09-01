"""How fast a position could actually be sold, and at what cost to the price."""

from __future__ import annotations

from datetime import timedelta

import pandas as pd

from .valuation import POSITION_KEYS, _now


def liquidity_table(positions: pd.DataFrame, tape: pd.DataFrame, settings: dict) -> pd.DataFrame:
    config = settings["liquidity"]
    window = int(config["liquidity_window_days"])
    high = float(config["high_liquidity_min_daily_sales"])
    medium = float(config["medium_liquidity_min_daily_sales"])
    impact_share = float(config["market_impact_warning_share"])

    result = positions[POSITION_KEYS + ["player_name", "cards_owned", "quick_sale_value_eur"]].copy()
    now = _now()

    for days, label in ((1, "sales_24h"), (7, "sales_7d"), (30, "sales_30d"), (window, "sales_window")):
        if tape.empty:
            result[label] = 0
            continue
        subset = tape[tape["occurred_at"] >= now - timedelta(days=days)]
        counts = subset.groupby(POSITION_KEYS).size().rename(label).reset_index()
        result = result.merge(counts, on=POSITION_KEYS, how="left")
        result[label] = result[label].fillna(0).astype(int)

    result["avg_daily_sales"] = (result["sales_window"] / window).round(3)
    result["my_share_of_volume_pct"] = (
        result["cards_owned"] / result["sales_window"].replace(0, pd.NA) * 100
    ).astype(float).round(1)

    # Days to liquidate: at the observed clearing rate, then a conservative view
    # that assumes undercutting the floor only gets you half the daily flow.
    daily = result["avg_daily_sales"].replace(0, pd.NA)
    result["liquidation_days"] = (result["cards_owned"] / daily).astype(float).round(1)
    result["liquidation_days_conservative"] = (result["cards_owned"] / (daily * 0.5)).astype(float).round(1)

    def band(rate: float) -> str:
        if pd.isna(rate) or rate <= 0:
            return "NO DATA"
        if rate >= high:
            return "HIGH"
        if rate >= medium:
            return "MEDIUM"
        return "LOW"

    result["liquidity_band"] = result["avg_daily_sales"].apply(band)
    result["market_impact_flag"] = (
        (result["my_share_of_volume_pct"] >= impact_share * 100)
        | (result["liquidity_band"] == "LOW")
    ).fillna(False).map({True: "WATCH", False: ""})
    return result
