"""Cards -> positions (Player x Scarcity x Season class), with player form."""

from __future__ import annotations

import pandas as pd

from .valuation import POSITION_KEYS


def load_cards(connection) -> pd.DataFrame:
    return pd.read_sql_query(
        "SELECT c.slug, c.player_slug, c.rarity, c.season_year, c.season_class, c.serial_number, "
        "c.positions, c.xp, c.acquired_at, c.acquisition_eur, c.acquisition_type, c.owned, "
        "p.display_name, p.club_name, p.club_slug, p.league, p.age "
        "FROM card c LEFT JOIN player p ON p.slug = c.player_slug",
        connection,
    )


def player_form(connection) -> pd.DataFrame:
    """L5 / L10 / L40 averages and starter share from the stored match scores."""
    scores = pd.read_sql_query(
        "SELECT player_slug, played_at, score, started, minutes, opponent "
        "FROM player_score ORDER BY played_at DESC",
        connection,
    )
    columns = ["player_slug", "l5", "l10", "l40", "starter_pct", "last_score", "next_opponent"]
    if scores.empty:
        # No per-match history stored: fall back to whatever aggregate form
        # fields the schema exposed (see queries/player_scores.graphql).
        fallback = pd.read_sql_query(
            "SELECT slug AS player_slug, l5_api AS l5, l15_api AS l10, l15_api AS l40 FROM player",
            connection,
        )
        if fallback.empty or fallback[["l5", "l10"]].isna().all().all():
            return pd.DataFrame(columns=columns)
        fallback["starter_pct"] = None
        fallback["last_score"] = None
        fallback["next_opponent"] = None
        return fallback[columns]

    rows = []
    for player_slug, group in scores.groupby("player_slug"):
        group = group.sort_values("played_at", ascending=False)
        played = group.dropna(subset=["score"])
        rows.append(
            {
                "player_slug": player_slug,
                "l5": round(played["score"].head(5).mean(), 1) if len(played) else None,
                "l10": round(played["score"].head(10).mean(), 1) if len(played) else None,
                "l40": round(played["score"].head(40).mean(), 1) if len(played) else None,
                "starter_pct": round(100 * group["started"].head(10).fillna(0).mean(), 0)
                if group["started"].notna().any()
                else None,
                "last_score": played["score"].iloc[0] if len(played) else None,
                "next_opponent": None,
            }
        )
    return pd.DataFrame(rows, columns=columns)


def build_positions(connection) -> pd.DataFrame:
    """One row per Player + Scarcity + Season class, over the cards you still own."""
    cards = load_cards(connection)
    owned = cards[cards["owned"] == 1].copy()
    if owned.empty:
        return pd.DataFrame(
            columns=POSITION_KEYS
            + [
                "player_name", "club_name", "league", "position", "age", "season_years",
                "cards_owned", "total_cost_eur", "avg_cost_eur", "serials",
            ]
        )

    owned["acquisition_eur"] = owned["acquisition_eur"].fillna(0.0)
    grouped = (
        owned.groupby(POSITION_KEYS)
        .agg(
            player_name=("display_name", "first"),
            club_name=("club_name", "first"),
            league=("league", "first"),
            position=("positions", "first"),
            age=("age", "first"),
            season_years=("season_year", lambda values: ", ".join(sorted({str(int(v)) for v in values.dropna()}))),
            cards_owned=("slug", "count"),
            total_cost_eur=("acquisition_eur", "sum"),
            serials=("serial_number", lambda values: ", ".join(str(int(v)) for v in values.dropna()[:8])),
            avg_xp=("xp", "mean"),
        )
        .reset_index()
    )
    # Cards received as rewards or crafts cost nothing, so the average is taken
    # over paid cards only - otherwise free cards would drag your basis to zero
    # and make every position look artificially profitable.
    paid = owned[owned["acquisition_eur"] > 0]
    paid_stats = (
        paid.groupby(POSITION_KEYS)
        .agg(paid_cards=("slug", "count"), paid_cost=("acquisition_eur", "sum"))
        .reset_index()
    )
    grouped = grouped.merge(paid_stats, on=POSITION_KEYS, how="left")
    grouped["paid_cards"] = grouped["paid_cards"].fillna(0).astype(int)
    grouped["paid_cost"] = grouped["paid_cost"].fillna(0.0)
    grouped["avg_cost_eur"] = (
        (grouped["paid_cost"] / grouped["paid_cards"].replace(0, pd.NA)).astype(float).round(2)
    )
    grouped["free_cards"] = grouped["cards_owned"] - grouped["paid_cards"]
    grouped["total_cost_eur"] = grouped["total_cost_eur"].round(2)

    form = player_form(connection)
    if not form.empty:
        grouped = grouped.merge(form, on="player_slug", how="left")
    else:
        for column in ("l5", "l10", "l40", "starter_pct", "last_score", "next_opponent"):
            grouped[column] = None
    return grouped


def finalise(positions: pd.DataFrame) -> pd.DataFrame:
    """Money columns that depend on the resolved valuation."""
    if positions.empty:
        return positions
    result = positions.copy()
    result["market_value_eur"] = (result["cards_owned"] * result["value_per_card_eur"]).round(2)
    result["quick_sale_value_eur"] = (result["cards_owned"] * result["quick_sale_price_eur"]).round(2)
    result["unrealized_pl_eur"] = (result["market_value_eur"] - result["total_cost_eur"]).round(2)
    result["unrealized_pl_pct"] = (
        result["unrealized_pl_eur"] / result["total_cost_eur"].replace(0, pd.NA) * 100
    ).astype(float).round(1)
    result["return_from_cost_pct"] = (
        result["value_per_card_eur"] / result["avg_cost_eur"].replace(0, pd.NA) - 1
    ).astype(float).mul(100).round(1)
    return result
