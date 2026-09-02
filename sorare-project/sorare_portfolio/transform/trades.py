"""Card-for-card trades: what you gave, what you got, and how it aged.

A trade is the one transaction type where P/L says nothing useful. No cash
changes hands for the cards, so nothing is realised - but you can still be
materially better or worse off, and only a comparison of market values shows it.

Each card leg carries two valuations:

* **at the trade date** - the median of completed sales for that position within
  a window around the trade, so it reflects what the card was worth then rather
  than what it is worth now;
* **today** - the same engine that values the rest of the portfolio.

Both carry a confidence flag, because a trade of a thinly traded player is
exactly where a made-up number would mislead you most.
"""

from __future__ import annotations

from datetime import timedelta

import pandas as pd

VALUATION_WINDOW_DAYS = 7
WIDER_WINDOW_DAYS = 30


def _value_at(tape: pd.DataFrame, position: tuple, when: pd.Timestamp) -> tuple[float | None, str]:
    """Median price for a position around a date, widening the window if thin."""
    if tape.empty or pd.isna(when):
        return None, "no data"
    player, rarity, season_class = position
    subset = tape[
        (tape["player_slug"] == player)
        & (tape["rarity"] == rarity)
        & (tape["season_class"] == season_class)
    ]
    if subset.empty:
        return None, "no data"

    for days, label in ((VALUATION_WINDOW_DAYS, "sales that week"), (WIDER_WINDOW_DAYS, "sales that month")):
        window = subset[
            (subset["occurred_at"] >= when - timedelta(days=days))
            & (subset["occurred_at"] <= when + timedelta(days=days))
        ]
        if len(window) >= 2:
            return round(float(window["eur"].median()), 2), label

    # Nothing near the date: fall back to the closest print there is, and say so.
    nearest = subset.iloc[(subset["occurred_at"] - when).abs().argsort()[:1]]
    if nearest.empty:
        return None, "no data"
    gap = abs((nearest.iloc[0]["occurred_at"] - when).days)
    return round(float(nearest.iloc[0]["eur"]), 2), f"nearest sale, {gap}d away"


def trade_table(transactions: pd.DataFrame, tape: pd.DataFrame, positions: pd.DataFrame) -> pd.DataFrame:
    """One row per card that moved in a trade, plus the cash on each trade."""
    columns = [
        "trade_id", "traded_on", "direction", "player_name", "player_slug", "rarity",
        "season_class", "card_slug", "counterparty", "value_at_trade_eur", "value_basis",
        "value_today_eur", "change_since_trade_eur", "change_since_trade_pct",
        "cash_paid_eur", "cash_received_eur", "trade_net_at_trade_eur", "trade_net_today_eur",
        "still_owned",
    ]
    if transactions.empty:
        return pd.DataFrame(columns=columns)

    swaps = transactions[transactions["txn_type"].isin(["DIRECT_OFFER", "DIRECT_OFFER_CASH"])]
    card_legs = swaps[swaps["card_slug"].notna()]
    if card_legs.empty:
        return pd.DataFrame(columns=columns)

    lookup = {}
    owned = set()
    if not positions.empty:
        for row in positions.itertuples(index=False):
            lookup[(row.player_slug, row.rarity, row.season_class)] = (
                row.value_per_card_eur,
                row.player_name,
            )
        owned = set(positions["player_slug"])

    rows = []
    for leg in card_legs.itertuples(index=False):
        position = (leg.player_slug, leg.rarity, leg.season_class)
        when = leg.occurred_at
        value_then, basis = _value_at(tape, position, when)
        value_now, player_name = lookup.get(position, (None, None))
        if value_now is None:
            value_now, _ = _value_at(tape, position, pd.Timestamp.now(tz="UTC"))

        change = (
            round(float(value_now) - float(value_then), 2)
            if value_now is not None and value_then is not None
            else None
        )
        rows.append(
            {
                "trade_id": leg.source_id,
                "traded_on": when,
                # "GAVE" is a card that left your gallery in the swap.
                "direction": "GAVE" if leg.side == "SELL" else "GOT",
                "player_name": player_name or leg.player_slug,
                "player_slug": leg.player_slug,
                "rarity": leg.rarity,
                "season_class": leg.season_class,
                "card_slug": leg.card_slug,
                "counterparty": leg.counterparty,
                "value_at_trade_eur": value_then,
                "value_basis": basis,
                "value_today_eur": round(float(value_now), 2) if value_now is not None else None,
                "change_since_trade_eur": change,
                "change_since_trade_pct": (
                    round(change / float(value_then) * 100, 1)
                    if change is not None and value_then
                    else None
                ),
                "still_owned": "yes" if leg.player_slug in owned else "no",
            }
        )

    table = pd.DataFrame(rows)

    # Cash sweeteners, and the per-trade totals repeated on every leg so the
    # sheet can be sorted and filtered without losing the trade's context.
    cash = swaps[swaps["card_slug"].isna()]
    paid = cash[cash["side"] == "BUY"].groupby("source_id")["eur"].sum()
    received = cash[cash["side"] == "SELL"].groupby("source_id")["eur"].sum()
    table["cash_paid_eur"] = table["trade_id"].map(paid).fillna(0.0).round(2)
    table["cash_received_eur"] = table["trade_id"].map(received).fillna(0.0).round(2)

    def net(frame: pd.DataFrame, column: str) -> pd.Series:
        got = frame[frame["direction"] == "GOT"].groupby("trade_id")[column].sum()
        gave = frame[frame["direction"] == "GAVE"].groupby("trade_id")[column].sum()
        return got.sub(gave, fill_value=0)

    net_then = net(table, "value_at_trade_eur")
    net_now = net(table, "value_today_eur")
    table["trade_net_at_trade_eur"] = (
        table["trade_id"].map(net_then).fillna(0)
        + table["cash_received_eur"] - table["cash_paid_eur"]
    ).round(2)
    table["trade_net_today_eur"] = (
        table["trade_id"].map(net_now).fillna(0)
        + table["cash_received_eur"] - table["cash_paid_eur"]
    ).round(2)

    table["traded_on"] = pd.to_datetime(table["traded_on"], utc=True, errors="coerce").dt.tz_localize(None)
    return table.sort_values(["traded_on", "trade_id", "direction"], ascending=[False, True, True])[columns]
