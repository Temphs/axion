"""Floor prices from live listings.

`tokens.liveSingleSaleOffers` takes a playerSlug, so floors are asked for one
position at a time: precise, and one cheap call per player you hold. If that
ever stops working the module falls back to a capped sweep of the whole live
feed, which is partial by nature - one more reason the floor is never the
primary valuation input. Fair value from completed sales is; the floor only
sets the quick-sale number.
"""

from __future__ import annotations

import logging
import sqlite3
from collections import defaultdict
from typing import Any

from .. import db
from ..client import BudgetExhausted, SorareApiError, SorareClient
from ..schema_doctor import load_capabilities
from .common import money_eur, rarity_of, render, season_class

log = logging.getLogger(__name__)

GLOBAL_SWEEP_PAGE_LIMIT = 20


def _record(buckets: dict[tuple, list[float]], card: dict[str, Any], player_slug: str, price: float) -> None:
    buckets[(player_slug, rarity_of(card), season_class(card))].append(price)


def _from_player_queries(
    client: SorareClient, connection: sqlite3.Connection
) -> tuple[dict[tuple, list[float]], list[str]]:
    query = render("live_single_sale_offers")
    buckets: dict[tuple, list[float]] = defaultdict(list)
    failures: list[str] = []
    slugs = [
        row["player_slug"]
        for row in connection.execute(
            "SELECT DISTINCT player_slug FROM card WHERE owned = 1 AND player_slug IS NOT NULL"
        )
    ]
    for slug in slugs:
        try:
            offers = list(
                client.paginate(
                    query,
                    {"playerSlug": slug},
                    path=("tokens", "liveSingleSaleOffers"),
                    operation_name="LiveSingleSaleOffers",
                    page_limit=5,
                )
            )
        except BudgetExhausted:
            break
        except SorareApiError as exc:
            failures.append(f"{slug}: {exc}")
            if len(failures) > 5:
                raise SorareApiError("player-scoped listings unavailable")
            continue
        for offer in offers:
            side = offer.get("senderSide") or {}
            price = money_eur(side.get("amounts"))
            if price is None:
                continue
            for card in side.get("anyCards") or []:
                _record(buckets, card, slug, price)
    return buckets, failures


def _from_global_sweep(
    client: SorareClient, connection: sqlite3.Connection
) -> tuple[dict[tuple, list[float]], list[str]]:
    tracked = {
        row["player_slug"]
        for row in connection.execute(
            "SELECT DISTINCT player_slug FROM card WHERE owned = 1 AND player_slug IS NOT NULL"
        )
    }
    buckets: dict[tuple, list[float]] = defaultdict(list)
    try:
        for node in client.paginate(
            render("live_single_sale_offers"),
            {},
            path=("tokens", "liveSingleSaleOffers"),
            operation_name="LiveSingleSaleOffers",
            page_limit=GLOBAL_SWEEP_PAGE_LIMIT,
        ):
            side = node.get("senderSide") or {}
            price = money_eur(side.get("amounts"))
            if price is None:
                continue
            for card in side.get("anyCards") or []:
                player_slug = (card.get("anyPlayer") or {}).get("slug")
                if player_slug in tracked:
                    _record(buckets, card, player_slug, price)
    except BudgetExhausted:
        pass
    return buckets, []


def ingest_floors(client: SorareClient, connection: sqlite3.Connection) -> dict[str, Any]:
    observed_at = db.utcnow()
    capabilities = load_capabilities()
    player_query_ok = (
        capabilities.get("queries", {}).get("live_single_sale_offers") or {}
    ).get("ok", True)

    method = "player_scoped"
    try:
        if not player_query_ok:
            raise SorareApiError("live listings query rejected by the schema doctor")
        buckets, failures = _from_player_queries(client, connection)
        if not buckets:
            raise SorareApiError("no listings returned per player")
    except SorareApiError as exc:
        log.info("Falling back to the global listings sweep for floors (%s)", exc)
        method = "global_sweep"
        buckets, failures = _from_global_sweep(client, connection)

    rows = [
        {
            "snap_key": db.natural_key(player, rarity, season, observed_at),
            "player_slug": player,
            "rarity": rarity,
            "season_class": season,
            "observed_at": observed_at,
            "floor_eur": min(prices),
            "listing_count": len(prices),
        }
        for (player, rarity, season), prices in buckets.items()
        if prices
    ]
    added = db.upsert_many(connection, "floor_snap", rows, key="snap_key")
    db.set_meta(connection, "floors_last_refresh", observed_at)
    db.set_meta(connection, "floors_method", method)
    log.info("Floors: %d positions priced via %s", len(rows), method)
    return {"positions_priced": len(rows), "rows_new": added, "method": method, "failures": failures}
