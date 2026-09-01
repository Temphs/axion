"""Realised P/L, reward accounting and the dashboard's headline numbers.

Realised P/L is matched per card, not by a portfolio-wide average: Sorare cards
are individually identified, and you have the exact price you paid for each one,
so a sale is matched to the purchase of that same card. The weighted-average
cost is still reported per position, because that is what you look at when
deciding whether to add.

Card-for-card trades are excluded from realised P/L (is_cash_trade = 0): swapping
two cards realises nothing, and counting it would inflate both sides.
"""

from __future__ import annotations

import pandas as pd


def load_transactions(connection) -> pd.DataFrame:
    transactions = pd.read_sql_query(
        "SELECT txn_key, occurred_at, card_slug, player_slug, rarity, season_year, season_class, "
        "txn_type, side, quantity, eur, counterparty, is_cash_trade FROM txn ORDER BY occurred_at",
        connection,
    )
    if transactions.empty:
        return transactions
    transactions["occurred_at"] = pd.to_datetime(transactions["occurred_at"], utc=True, errors="coerce")
    return transactions


def realised_trades(transactions: pd.DataFrame) -> pd.DataFrame:
    """One row per completed sale, with the cost of that exact card attached."""
    columns = [
        "card_slug", "player_slug", "rarity", "season_class", "bought_at", "sold_at",
        "buy_eur", "sell_eur", "realised_pl_eur", "realised_pl_pct", "sale_type", "counterparty",
    ]
    if transactions.empty:
        return pd.DataFrame(columns=columns)

    buys = transactions[(transactions["side"] == "BUY") & (transactions["is_cash_trade"] == 1)]
    sells = transactions[(transactions["side"] == "SELL") & (transactions["is_cash_trade"] == 1)]
    if sells.empty:
        return pd.DataFrame(columns=columns)

    rows = []
    for _, sale in sells.iterrows():
        prior = buys[
            (buys["card_slug"] == sale["card_slug"]) & (buys["occurred_at"] <= sale["occurred_at"])
        ].sort_values("occurred_at")
        buy = prior.iloc[-1] if len(prior) else None
        buy_price = float(buy["eur"]) if buy is not None and pd.notna(buy["eur"]) else None
        sell_price = float(sale["eur"]) if pd.notna(sale["eur"]) else 0.0
        realised = round(sell_price - buy_price, 2) if buy_price is not None else None
        rows.append(
            {
                "card_slug": sale["card_slug"],
                "player_slug": sale["player_slug"],
                "rarity": sale["rarity"],
                "season_class": sale["season_class"],
                "bought_at": buy["occurred_at"] if buy is not None else None,
                "sold_at": sale["occurred_at"],
                "buy_eur": buy_price,
                "sell_eur": sell_price,
                "realised_pl_eur": realised,
                "realised_pl_pct": round(realised / buy_price * 100, 1)
                if realised is not None and buy_price
                else None,
                "sale_type": sale["txn_type"],
                "counterparty": sale["counterparty"],
            }
        )
    return pd.DataFrame(rows, columns=columns)


def rewards_table(connection, positions: pd.DataFrame) -> pd.DataFrame:
    """Reward lines, with reward cards valued at today's price as well as at receipt."""
    rewards = pd.read_sql_query(
        "SELECT reward_key, received_at, gameweek, competition, lineup, scarcity, cash_eur, "
        "card_slug, card_value_at_receipt, essence_amount, essence_scarcity, xp_amount, source "
        "FROM reward",
        connection,
    )
    cards = pd.read_sql_query(
        "SELECT slug AS card_slug, player_slug, rarity, season_class FROM card", connection
    )
    if rewards.empty:
        return pd.DataFrame(
            columns=list(rewards.columns) + ["current_card_value_eur", "card_appreciation_eur", "total_value_eur"]
        )

    valued = rewards.merge(cards, on="card_slug", how="left")
    if not positions.empty:
        valued = valued.merge(
            positions[["player_slug", "rarity", "season_class", "value_per_card_eur"]],
            on=["player_slug", "rarity", "season_class"],
            how="left",
        )
    else:
        valued["value_per_card_eur"] = pd.NA

    valued["current_card_value_eur"] = valued["value_per_card_eur"].astype(float).round(2)
    valued["card_appreciation_eur"] = (
        valued["current_card_value_eur"].fillna(0) - valued["card_value_at_receipt"].fillna(0)
    ).round(2)
    # Essence and XP are deliberately not monetised here: the Essence sheet
    # derives your own EUR per 1,000 from actual crafts instead of guessing.
    valued["total_value_eur"] = (
        valued["cash_eur"].fillna(0) + valued["card_value_at_receipt"].fillna(0)
    ).round(2)
    return valued.drop(columns=["value_per_card_eur"], errors="ignore")


def headline_numbers(
    connection,
    positions: pd.DataFrame,
    realised: pd.DataFrame,
    rewards: pd.DataFrame,
    settings: dict,
) -> dict[str, float]:
    """The base quantities the Dashboard is built from.

    Anything that depends on a Settings assumption (the quick-sale discount in
    particular) is exported both raw and applied, so the Excel sheet can react to
    a changed assumption immediately.
    """
    flows = pd.read_sql_query("SELECT direction, amount_eur FROM cash_flow", connection)
    deposits = float(flows[flows["direction"] == "DEPOSIT"]["amount_eur"].sum()) if not flows.empty else 0.0
    withdrawals = float(flows[flows["direction"] == "WITHDRAWAL"]["amount_eur"].sum()) if not flows.empty else 0.0

    cash = float(settings.get("account", {}).get("cash_balance_eur", 0.0) or 0.0)
    discount = float(settings["valuation"]["quick_sale_discount"])

    if positions.empty:
        market_value = quick_sale_value = floor_value = acquisition_cost = 0.0
        cards_owned = 0
    else:
        market_value = float(positions["market_value_eur"].fillna(0).sum())
        quick_sale_value = float(positions["quick_sale_value_eur"].fillna(0).sum())
        floor_value = float(
            (positions["floor_eur"].fillna(positions["value_per_card_eur"]) * positions["cards_owned"])
            .fillna(0)
            .sum()
        )
        acquisition_cost = float(positions["total_cost_eur"].fillna(0).sum())
        cards_owned = int(positions["cards_owned"].sum())

    realised_pl = float(realised["realised_pl_eur"].fillna(0).sum()) if not realised.empty else 0.0
    unrealised_pl = round(market_value - acquisition_cost, 2)

    cash_rewards = float(rewards["cash_eur"].fillna(0).sum()) if not rewards.empty else 0.0
    reward_card_value = (
        float(rewards["card_value_at_receipt"].fillna(0).sum()) if not rewards.empty else 0.0
    )
    reward_card_now = (
        float(rewards["current_card_value_eur"].fillna(0).sum()) if not rewards.empty else 0.0
    )
    essence_earned = pd.read_sql_query(
        "SELECT IFNULL(SUM(amount), 0) AS total FROM essence_event WHERE direction = 'EARN'", connection
    )["total"].iloc[0]

    nav = round(cash + quick_sale_value, 2)
    economic_pl = round(nav + withdrawals - deposits, 2)

    return {
        "cash_balance_eur": round(cash, 2),
        "cards_owned": cards_owned,
        "acquisition_cost_eur": round(acquisition_cost, 2),
        "market_value_eur": round(market_value, 2),
        "gallery_floor_value_eur": round(floor_value, 2),
        "quick_sale_value_eur": round(quick_sale_value, 2),
        "quick_sale_discount": discount,
        "realized_pl_eur": round(realised_pl, 2),
        "unrealized_pl_eur": unrealised_pl,
        "cash_rewards_eur": round(cash_rewards, 2),
        "reward_card_value_at_receipt_eur": round(reward_card_value, 2),
        "reward_card_value_now_eur": round(reward_card_now, 2),
        "rewards_total_eur": round(cash_rewards + reward_card_value, 2),
        "essence_earned": float(essence_earned or 0),
        "deposits_eur": round(deposits, 2),
        "withdrawals_eur": round(withdrawals, 2),
        "nav_eur": nav,
        "economic_pl_eur": economic_pl,
        "roi_pct": round(economic_pl / deposits * 100, 2) if deposits else 0.0,
    }


def write_snapshot(connection, headline: dict[str, float]) -> None:
    """Append today's NAV so the time-series charts have a history to draw."""
    from .. import db

    connection.execute(
        "INSERT OR REPLACE INTO portfolio_snapshot (taken_at, cash_eur, cards_owned, "
        "acquisition_cost, market_value, quick_sale_value, nav, unrealized_pl, realized_pl, "
        "deposits, withdrawals, economic_pl, rewards_total) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            db.utcnow(),
            headline["cash_balance_eur"],
            headline["cards_owned"],
            headline["acquisition_cost_eur"],
            headline["market_value_eur"],
            headline["quick_sale_value_eur"],
            headline["nav_eur"],
            headline["unrealized_pl_eur"],
            headline["realized_pl_eur"],
            headline["deposits_eur"],
            headline["withdrawals_eur"],
            headline["economic_pl_eur"],
            headline["rewards_total_eur"],
        ),
    )
