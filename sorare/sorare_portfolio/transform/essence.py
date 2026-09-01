"""Essence: what you earned, what you spent, and what it was actually worth.

Sorare does not expose Essence in its public API, so this reads your ledger.
The point of the sheet is the last column: your own empirical EUR per 1,000
Essence, computed from the market value of the cards your crafts produced,
Limited and Rare kept strictly separate.
"""

from __future__ import annotations

import pandas as pd


def essence_tables(connection, positions: pd.DataFrame) -> dict[str, pd.DataFrame]:
    events = pd.read_sql_query("SELECT * FROM essence_event", connection)
    if events.empty:
        empty = pd.DataFrame(
            columns=["scarcity", "earned", "spent", "crafts", "card_value_eur", "eur_per_1000", "roi_pct"]
        )
        return {"essence_ledger": events, "essence_summary": empty, "essence_by_draw": empty}

    cards = pd.read_sql_query(
        "SELECT slug AS card_slug, player_slug, rarity, season_class FROM card", connection
    )
    ledger = events.merge(cards, on="card_slug", how="left")

    # A crafted card you still own is priced by the same engine as the rest of
    # the portfolio; a value typed into the ledger wins if it is there.
    if not positions.empty:
        ledger = ledger.merge(
            positions[["player_slug", "rarity", "season_class", "value_per_card_eur"]],
            on=["player_slug", "rarity", "season_class"],
            how="left",
        )
    else:
        ledger["value_per_card_eur"] = pd.NA
    ledger["card_value_eur"] = ledger["card_value"].fillna(ledger["value_per_card_eur"]).astype(float)
    ledger["total_craft_cost"] = ledger["base_cost"].fillna(0) + ledger["clue_cost"].fillna(0)

    spends = ledger[ledger["direction"] == "SPEND"]
    earns = ledger[ledger["direction"] == "EARN"]

    rows = []
    for scarcity in sorted(set(ledger["scarcity"].dropna())):
        spent = spends[spends["scarcity"] == scarcity]
        earned_total = float(earns[earns["scarcity"] == scarcity]["amount"].fillna(0).sum())
        essence_spent = float(spent["total_craft_cost"].fillna(0).sum()) or float(
            spent["amount"].fillna(0).sum()
        )
        value = float(spent["card_value_eur"].fillna(0).sum())
        rows.append(
            {
                "scarcity": scarcity,
                "earned": earned_total,
                "spent": essence_spent,
                "crafts": int(len(spent)),
                "card_value_eur": round(value, 2),
                "eur_per_1000": round(value / essence_spent * 1000, 2) if essence_spent else None,
                "avg_craft_value_eur": round(spent["card_value_eur"].mean(), 2) if len(spent) else None,
                "median_craft_value_eur": round(spent["card_value_eur"].median(), 2) if len(spent) else None,
                "roi_pct": None,
            }
        )
    summary = pd.DataFrame(rows)

    by_draw = (
        spends.groupby(["scarcity", "draw_type"], dropna=False)
        .agg(
            crafts=("event_key", "count"),
            essence_spent=("total_craft_cost", "sum"),
            card_value_eur=("card_value_eur", "sum"),
            avg_value_eur=("card_value_eur", "mean"),
            median_value_eur=("card_value_eur", "median"),
        )
        .reset_index()
    )
    if not by_draw.empty:
        by_draw["eur_per_1000"] = (
            by_draw["card_value_eur"] / by_draw["essence_spent"].replace(0, pd.NA) * 1000
        ).astype(float).round(2)
        for column in ("card_value_eur", "avg_value_eur", "median_value_eur", "essence_spent"):
            by_draw[column] = by_draw[column].astype(float).round(2)

    return {
        "essence_ledger": ledger.drop(columns=["value_per_card_eur"], errors="ignore"),
        "essence_summary": summary,
        "essence_by_draw": by_draw,
    }
