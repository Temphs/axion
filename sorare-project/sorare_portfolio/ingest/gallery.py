"""Pull the whole gallery and derive cost basis from it.

This is the module that removes the manual data entry: every card you own
arrives with its acquisition date and the price you paid, straight from the
ownership record, so nothing has to be typed in.
"""

from __future__ import annotations

import logging
import sqlite3
from typing import Any

from .. import db
from ..client import SorareClient
from .common import (
    NON_PURCHASE_TYPES,
    iso,
    money_eur,
    normalise_type,
    player_row,
    rarity_of,
    render,
    season_class,
    wei_of,
)

log = logging.getLogger(__name__)


def _card_rows(node: dict[str, Any], seen_at: str) -> tuple[dict, dict | None, dict | None]:
    player = node.get("anyPlayer") or {}
    owner = node.get("tokenOwner") or {}
    amounts = owner.get("amounts") or {}
    acquired_at = iso(owner.get("from"))
    price = money_eur(amounts)
    # tokenOwner.transferType is Sorare's own OwnerTransfer enum, so how a card
    # arrived is read rather than guessed: REWARD, SHARDS (an Essence craft),
    # PACK and the rest each say exactly what happened.
    acquisition_type = normalise_type(owner.get("transferType"), default="UNKNOWN")
    if acquisition_type == "UNKNOWN" and (price is None or price == 0):
        acquisition_type = "REWARD_OR_CRAFT"

    positions = node.get("anyPositions") or []
    card = {
        "slug": node.get("slug"),
        "asset_id": node.get("assetId"),
        "player_slug": player.get("slug"),
        "rarity": rarity_of(node),
        "season_year": node.get("seasonYear"),
        "season_class": season_class(node),
        "serial_number": node.get("serialNumber"),
        "positions": ", ".join(positions) if isinstance(positions, list) else positions,
        "xp": node.get("xp"),
        "grade": node.get("grade"),
        "acquired_at": acquired_at,
        "acquisition_eur": price,
        "acquisition_type": acquisition_type,
        "owned": 1,
        "first_seen": seen_at,
        "last_seen": seen_at,
    }

    person = player_row(player, node.get("anyTeam"))
    if person:
        person["position"] = card["positions"]
        person["updated_at"] = seen_at

    transaction = None
    if card["slug"] and acquired_at:
        is_purchase = acquisition_type not in NON_PURCHASE_TYPES and acquisition_type != "REWARD_OR_CRAFT"
        transaction = {
            "txn_key": db.natural_key("owner", card["slug"], acquired_at),
            "source_id": card["slug"],
            "occurred_at": acquired_at,
            "card_slug": card["slug"],
            "player_slug": card["player_slug"],
            "rarity": card["rarity"],
            "season_year": card["season_year"],
            "season_class": card["season_class"],
            "txn_type": acquisition_type,
            "side": "BUY" if is_purchase else "RECEIVE",
            "quantity": 1,
            "eur": price or 0.0,
            "wei": wei_of(amounts),
            "counterparty": None,
            "is_cash_trade": 1 if is_purchase and price else 0,
            "ingested_at": seen_at,
        }
    return card, person, transaction


def ingest_gallery(client: SorareClient, connection: sqlite3.Connection) -> dict[str, int]:
    seen_at = db.utcnow()
    query = render("gallery")

    cards: list[dict] = []
    players: dict[str, dict] = {}
    transactions: list[dict] = []

    for node in client.paginate(
        query,
        {},
        path=("currentUser", "cards"),
        operation_name="Gallery",
        snapshot="gallery",
    ):
        card, person, transaction = _card_rows(node, seen_at)
        if not card["slug"]:
            continue
        cards.append(card)
        if person:
            players[person["slug"]] = person
        if transaction:
            transactions.append(transaction)

    new_players = db.upsert_many(
        connection,
        "player",
        players.values(),
        key="slug",
        update=["display_name", "club_slug", "club_name", "league", "position", "age", "updated_at"],
    )
    new_cards = db.upsert_many(
        connection,
        "card",
        cards,
        key="slug",
        update=[
            "asset_id", "player_slug", "rarity", "season_year", "season_class", "serial_number",
            "positions", "xp", "grade", "acquired_at", "acquisition_eur", "acquisition_type",
            "owned", "last_seen",
        ],
    )
    new_txns = db.upsert_many(connection, "txn", transactions, key="txn_key")

    # Anything not seen in this full sweep has left the gallery.
    owned_slugs = [card["slug"] for card in cards]
    if owned_slugs:
        placeholders = ",".join("?" for _ in owned_slugs)
        connection.execute(
            f"UPDATE card SET owned = 0 WHERE owned = 1 AND slug NOT IN ({placeholders})",
            owned_slugs,
        )

    db.set_meta(connection, "gallery_last_refresh", seen_at)
    log.info("Gallery: %d cards (%d new), %d players", len(cards), new_cards, len(players))
    return {
        "cards_seen": len(cards),
        "cards_new": new_cards,
        "players_new": new_players,
        "txns_new": new_txns,
    }
