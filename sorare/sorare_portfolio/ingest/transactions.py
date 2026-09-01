"""Your own trade history: auctions won, listings bought and sold, offers.

Each source is pulled independently and failure is contained: if Sorare renames
one connection, the other four still load and the run is reported PARTIAL rather
than failing outright.
"""

from __future__ import annotations

import logging
import sqlite3
from typing import Any, Callable, Iterable

from .. import db
from ..client import BudgetExhausted, SorareApiError, SorareClient
from .common import iso, money_eur, normalise_type, rarity_of, render, season_class, wei_of

log = logging.getLogger(__name__)


def _cards_of(side: dict[str, Any] | None) -> list[dict[str, Any]]:
    return (side or {}).get("anyCards") or []


def _first_user(entity: dict[str, Any] | None) -> str | None:
    if not entity:
        return None
    return entity.get("nickname") or entity.get("slug")


def _legs(
    node: dict[str, Any],
    *,
    cards: Iterable[dict[str, Any]],
    amounts: dict[str, Any] | None,
    occurred_at: str | None,
    txn_type: str,
    side: str,
    counterparty: str | None,
    source: str,
) -> list[dict]:
    """Turn one API object into one transaction row per card involved.

    When several cards move for a single price (a bundle, a trade), the price is
    split evenly across them so per-card cost basis stays coherent and the total
    still reconciles.
    """
    cards = list(cards)
    if not cards or not occurred_at:
        return []

    total = money_eur(amounts)
    per_card = round(total / len(cards), 2) if total is not None else None
    rows: list[dict] = []
    for card in cards:
        slug = card.get("slug")
        if not slug:
            continue
        player = card.get("anyPlayer") or {}
        rows.append(
            {
                "txn_key": db.natural_key(source, node.get("id"), slug, occurred_at, side),
                "source_id": str(node.get("id") or ""),
                "occurred_at": occurred_at,
                "card_slug": slug,
                "player_slug": player.get("slug"),
                "rarity": rarity_of(card),
                "season_year": card.get("seasonYear"),
                "season_class": season_class(card),
                "txn_type": txn_type,
                "side": side,
                "quantity": 1,
                "eur": per_card if per_card is not None else 0.0,
                "wei": wei_of(amounts),
                "counterparty": counterparty,
                "is_cash_trade": 1 if per_card else 0,
                "ingested_at": db.utcnow(),
            }
        )
    return rows


def _parse_won_auction(node: dict[str, Any]) -> list[dict]:
    amounts = (node.get("bestBid") or {}).get("amounts") or {"eur": node.get("currentPrice")}
    return _legs(
        node,
        cards=node.get("anyCards") or [],
        amounts=amounts,
        occurred_at=iso(node.get("endDate")),
        txn_type="AUCTION",
        side="BUY",
        counterparty="Sorare auction",
        source="won_auction",
    )


def _parse_bought_offer(node: dict[str, Any]) -> list[dict]:
    side_data = node.get("senderSide") or {}
    return _legs(
        node,
        cards=_cards_of(side_data),
        amounts=side_data.get("amounts"),
        occurred_at=iso(node.get("acceptedAt") or node.get("endDate")),
        txn_type="MANAGER_SALE",
        side="BUY",
        counterparty=_first_user(node.get("sender")),
        source="bought_offer",
    )


def _parse_sold_offer(node: dict[str, Any]) -> list[dict]:
    side_data = node.get("senderSide") or {}
    return _legs(
        node,
        cards=_cards_of(side_data),
        amounts=side_data.get("amounts"),
        occurred_at=iso(node.get("acceptedAt") or node.get("endDate")),
        txn_type="MANAGER_SALE",
        side="SELL",
        counterparty=_first_user(node.get("receiver")),
        source="sold_offer",
    )


def _parse_ended_offer(node: dict[str, Any], *, sent: bool) -> list[dict]:
    """A direct offer or buy offer that ended.

    Only accepted offers are transactions; rejected and cancelled ones are noise.
    Card-for-card legs are recorded with is_cash_trade = 0 so a swap never lands
    in realised P/L as if it were a sale.
    """
    status = str(node.get("status") or "").upper()
    accepted_at = iso(node.get("acceptedAt"))
    if not accepted_at and status not in ("ACCEPTED", "ENDED_ACCEPTED"):
        return []

    offer_type = normalise_type(node.get("type"), default="DIRECT_OFFER")
    occurred_at = accepted_at or iso(node.get("endDate"))
    sender_side = node.get("senderSide") or {}
    receiver_side = node.get("receiverSide") or {}
    counterparty = _first_user(node.get("receiver") if sent else node.get("sender"))

    rows: list[dict] = []
    # Cards leaving the sender's side; you are the sender when `sent` is true.
    rows += _legs(
        node,
        cards=_cards_of(sender_side),
        amounts=sender_side.get("amounts"),
        occurred_at=occurred_at,
        txn_type=offer_type,
        side="SELL" if sent else "BUY",
        counterparty=counterparty,
        source="ended_offer_sent" if sent else "ended_offer_received",
    )
    rows += _legs(
        node,
        cards=_cards_of(receiver_side),
        amounts=receiver_side.get("amounts"),
        occurred_at=occurred_at,
        txn_type=offer_type,
        side="BUY" if sent else "SELL",
        counterparty=counterparty,
        source="ended_offer_sent" if sent else "ended_offer_received",
    )
    return rows


SOURCES: list[tuple[str, str, tuple[str, ...], Callable[[dict], list[dict]]]] = [
    ("my_won_auctions", "MyWonAuctions", ("currentUser", "wonTokenAuctions"), _parse_won_auction),
    (
        "my_bought_offers",
        "MyBoughtSingleSaleOffers",
        ("currentUser", "boughtSingleSaleTokenOffers"),
        _parse_bought_offer,
    ),
    (
        "my_sold_offers",
        "MySoldSingleSaleOffers",
        ("currentUser", "soldSingleSaleTokenOffers"),
        _parse_sold_offer,
    ),
    (
        "my_ended_offers_sent",
        "MyEndedOffersSent",
        ("currentUser", "endedTokenOffersSent"),
        lambda node: _parse_ended_offer(node, sent=True),
    ),
    (
        "my_ended_offers_received",
        "MyEndedOffersReceived",
        ("currentUser", "endedTokenOffersReceived"),
        lambda node: _parse_ended_offer(node, sent=False),
    ),
]


def _tape_rows(transactions: list[dict]) -> list[dict]:
    """Your own completed cash trades are genuine market prints - keep them."""
    rows = []
    for txn in transactions:
        if not txn["is_cash_trade"] or not txn["eur"] or not txn["player_slug"]:
            continue
        rows.append(
            {
                "obs_key": db.natural_key(
                    "own", txn["player_slug"], txn["rarity"], txn["occurred_at"], txn["eur"]
                ),
                "player_slug": txn["player_slug"],
                "rarity": txn["rarity"],
                "season_year": txn["season_year"],
                "season_class": txn["season_class"],
                "occurred_at": txn["occurred_at"],
                "eur": txn["eur"],
                "wei": txn["wei"],
                "sale_type": txn["txn_type"],
                "card_slug": txn["card_slug"],
                "source": "own_transaction",
                "first_seen": db.utcnow(),
            }
        )
    return rows


def ingest_transactions(client: SorareClient, connection: sqlite3.Connection) -> dict[str, Any]:
    collected: list[dict] = []
    failures: list[str] = []

    for query_name, operation, path, parse in SOURCES:
        try:
            for node in client.paginate(
                render(query_name),
                {},
                path=path,
                operation_name=operation,
                snapshot=query_name,
            ):
                collected.extend(parse(node))
        except BudgetExhausted:
            raise
        except SorareApiError as exc:
            log.warning("Transaction source %s unavailable: %s", query_name, exc)
            failures.append(f"{query_name}: {exc}")

    # The same trade can surface from two connections; the natural key collapses
    # them, so a card is never counted twice.
    unique = {row["txn_key"]: row for row in collected}
    new_txns = db.upsert_many(connection, "txn", unique.values(), key="txn_key")
    new_prints = db.upsert_many(connection, "price_obs", _tape_rows(list(unique.values())), key="obs_key")

    db.set_meta(connection, "transactions_last_refresh", db.utcnow())
    return {
        "txns_seen": len(unique),
        "txns_new": new_txns,
        "tape_new": new_prints,
        "failures": failures,
    }
