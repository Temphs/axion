"""Thesis tracking with probability-weighted scenarios.

Expected Future Price = sum(probability x scenario price), compared against the
live valuation of the same position, so a thesis is scored against the market
rather than against the price you wish you could get.
"""

from __future__ import annotations

import pandas as pd

from .numbers import numeric

SCENARIOS = (("bear", "bear"), ("base", "base"), ("bull", "bull"), ("extreme", "extreme"))


def investment_table(connection, positions: pd.DataFrame) -> pd.DataFrame:
    investments = pd.read_sql_query("SELECT * FROM investment", connection)
    if investments.empty:
        return investments

    if not positions.empty:
        live = (
            positions.groupby(["player_slug", "rarity"])
            .agg(
                current_price_eur=("value_per_card_eur", "mean"),
                held_cards=("cards_owned", "sum"),
                held_avg_cost=("avg_cost_eur", "mean"),
            )
            .reset_index()
        )
        investments = investments.merge(live, on=["player_slug", "rarity"], how="left")
    else:
        investments["current_price_eur"] = pd.NA
        investments["held_cards"] = pd.NA
        investments["held_avg_cost"] = pd.NA

    probabilities = investments[[f"{name}_prob" for name, _ in SCENARIOS]].fillna(0)
    investments["probability_total"] = probabilities.sum(axis=1).round(3)
    investments["probability_warning"] = investments["probability_total"].apply(
        lambda total: "" if abs(total - 1.0) < 0.01 else "probabilities do not sum to 1"
    )

    expected = sum(
        investments[f"{name}_prob"].fillna(0) * investments[f"{name}_price"].fillna(0)
        for name, _ in SCENARIOS
    )
    investments["expected_price_eur"] = expected.round(2)

    # Fall back to your own entry when the market has nothing to say yet.
    reference = investments["current_price_eur"].fillna(investments["avg_entry"])
    investments["reference_price_eur"] = numeric(reference).round(2)
    investments["expected_upside_pct"] = numeric(
        (investments["expected_price_eur"] / reference.replace(0, pd.NA) - 1) * 100
    ).round(1)
    quantity = investments["quantity"].fillna(investments["held_cards"]).fillna(0)
    investments["expected_profit_eur"] = numeric(
        (investments["expected_price_eur"] - reference.fillna(0)) * quantity
    ).round(2)

    upside = numeric(investments["bull_price"].fillna(investments["target_price"]) - reference)
    downside = numeric(reference - investments["downside_price"].fillna(0))
    investments["risk_reward_ratio"] = (upside / downside.replace(0, pd.NA)).round(2)
    return investments
