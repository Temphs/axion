"""The price tape: completed public sales, accumulated run after run.

`tokenPrices` returns only the most recent handful of sales per player and
rarity, so no single call can give you a 30- or 90-day history. The tape is
built by asking often and de-duplicating: every run appends what it has not seen
before. This is why the updater is meant to run hourly.
"""

from __future__ import annotations

import logging
import sqlite3
from typing import Any

from .. import db
from ..client import BudgetExhausted, SorareApiError, SorareClient
from ..schema_doctor import load_capabilities
from .common import current_season_year, iso, money_eur, normalise_type, render, wei_of

log = logging.getLogger(__name__)


def rarity_argument(rarity: str) -> str:
    """Send the rarity spelling this schema actually declares."""
    values = (load_capabilities().get("enums") or {}).get("Rarity") or []
    if not values:
        return rarity
    lowered = {value.lower(): value for value in values}
    return lowered.get(rarity.lower(), rarity)


def tracked_positions(connection: sqlite3.Connection, extra_slugs: list[str]) -> list[tuple[str, str]]:
    """(player_slug, rarity) pairs worth watching: everything you own, plus your watchlist."""
    rows = connection.execute(
        "SELECT DISTINCT player_slug, rarity FROM card "
        "WHERE owned = 1 AND player_slug IS NOT NULL AND rarity IS NOT NULL"
    ).fetchall()
    positions = {(row["player_slug"], row["rarity"]) for row in rows}
    for slug in extra_slugs:
        for rarity in ("limited", "rare"):
            positions.add((slug, rarity))
    return sorted(positions)


def _observation(node: dict[str, Any], player_slug: str, rarity: str) -> dict | None:
    price = money_eur(node.get("amounts"))
    occurred_at = iso(node.get("date"))
    if price is None or not occurred_at:
        return None
    card = node.get("card") or {}
    season_year = card.get("seasonYear")
    return {
        "obs_key": db.natural_key("tokenPrices", player_slug, rarity, occurred_at, price, card.get("slug")),
        "player_slug": player_slug,
        "rarity": rarity,
        "season_year": season_year,
        "season_class": (
            "IN_SEASON"
            if season_year is not None and int(season_year) == current_season_year()
            else ("CLASSIC" if season_year is not None else "UNKNOWN")
        ),
        "occurred_at": occurred_at,
        "eur": price,
        "wei": wei_of(node.get("amounts")),
        # `deal` names the venue (auction vs single sale offer) where available.
        "sale_type": normalise_type(node.get("deal"), default="UNKNOWN"),
        "card_slug": card.get("slug"),
        "source": "tokenPrices",
        "first_seen": db.utcnow(),
    }


def ingest_prices(
    client: SorareClient,
    connection: sqlite3.Connection,
    *,
    extra_slugs: list[str] | None = None,
) -> dict[str, Any]:
    query = render("token_prices")
    positions = tracked_positions(connection, extra_slugs or [])
    observations: list[dict] = []
    failures: list[str] = []

    for player_slug, rarity in positions:
        try:
            data = client.execute(
                query,
                {"playerSlug": player_slug, "rarity": rarity_argument(rarity)},
                operation_name="TokenPrices",
            )
        except BudgetExhausted:
            log.warning("Call budget spent after %d positions; the rest wait for the next run.", len(observations))
            break
        except SorareApiError as exc:
            failures.append(f"{player_slug}/{rarity}: {exc}")
            if len(failures) > 10:
                log.error("Too many tokenPrices failures, stopping this module.")
                break
            continue

        for node in data.get("tokenPrices") or []:
            observation = _observation(node, player_slug, rarity)
            if observation:
                observations.append(observation)

    new_prints = db.upsert_many(connection, "price_obs", observations, key="obs_key")
    db.set_meta(connection, "prices_last_refresh", db.utcnow())
    log.info("Price tape: %d positions polled, %d new prints", len(positions), new_prints)
    return {
        "positions_polled": len(positions),
        "observations_seen": len(observations),
        "tape_new": new_prints,
        "failures": failures,
    }
