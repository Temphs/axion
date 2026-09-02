"""The price tape: completed public sales.

`tokens.tokenPrices` accepts a `from` date, so the first run backfills a whole
window in one call per position rather than only catching the latest handful.
After that each run asks for sales since the newest print it already holds, and
de-duplicates on a natural key - so running hourly is cheap, and running rarely
costs you resolution but not history.

`deal` names the venue each sale happened on, which is what lets fair value
count genuine secondary-market trades and leave auctions and instant buys out.
"""

from __future__ import annotations

import logging
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Any

from .. import db
from ..client import BudgetExhausted, SorareApiError, SorareClient
from ..schema_doctor import load_capabilities
from .common import current_season_year, iso, money_eur, normalise_type, render, wei_of

# How far back the first run reaches. Everything after that is incremental.
BACKFILL_DAYS = 90
MAX_PRINTS_PER_CALL = 50

log = logging.getLogger(__name__)


def rarity_argument(rarity: str) -> str:
    """Send the rarity spelling this schema actually declares."""
    values = (load_capabilities().get("enums") or {}).get("Rarity") or []
    if not values:
        return rarity
    lowered = {value.lower(): value for value in values}
    return lowered.get(rarity.lower(), rarity)


# Rarities with a real secondary market. Common cards are given away by the
# thousand and custom series are one-offs; neither has a price tape worth
# polling, and asking for one wastes the run's call budget.
PRICED_RARITIES = ("limited", "rare", "super_rare", "unique")


def tracked_positions(connection: sqlite3.Connection, extra_slugs: list[str]) -> list[tuple[str, str]]:
    """(player_slug, rarity) pairs worth watching: everything you own, plus your watchlist."""
    placeholders = ",".join("?" for _ in PRICED_RARITIES)
    rows = connection.execute(
        "SELECT DISTINCT player_slug, rarity FROM card "
        f"WHERE owned = 1 AND player_slug IS NOT NULL AND rarity IN ({placeholders})",
        PRICED_RARITIES,
    ).fetchall()
    positions = {(row["player_slug"], row["rarity"]) for row in rows}
    for slug in extra_slugs:
        for rarity in ("limited", "rare"):
            positions.add((slug, rarity))
    return sorted(positions)


def sale_type_of(deal: dict[str, Any] | None) -> str:
    """Which venue a completed sale happened on.

    TokenDeal is a union, so the __typename separates auctions and instant buys
    from manager-to-manager offers, and OfferType then separates a listing from
    an accepted buy offer or a direct offer.
    """
    if not deal:
        return "UNKNOWN"
    kind = deal.get("__typename")
    if kind == "TokenAuction":
        return "AUCTION"
    if kind == "TokenPrimaryOffer":
        return "INSTANT_BUY"
    if kind == "TokenOffer":
        return normalise_type(deal.get("type"), default="MANAGER_SALE")
    return "UNKNOWN"


def _since(connection: sqlite3.Connection, player_slug: str, rarity: str) -> str:
    """Ask only for sales newer than the newest one already stored."""
    row = connection.execute(
        "SELECT MAX(occurred_at) AS latest FROM price_obs WHERE player_slug = ? AND rarity = ?",
        (player_slug, rarity),
    ).fetchone()
    latest = row["latest"] if row else None
    if latest:
        return latest
    return (datetime.now(timezone.utc) - timedelta(days=BACKFILL_DAYS)).isoformat(timespec="seconds")


def _observation(node: dict[str, Any], player_slug: str, rarity: str) -> dict | None:
    price = money_eur(node.get("amounts"))
    occurred_at = iso(node.get("date"))
    if price is None or not occurred_at:
        return None
    card = node.get("card") or {}
    season_year = card.get("seasonYear")
    in_season = card.get("inSeasonEligible")
    return {
        "obs_key": db.natural_key("tokenPrices", player_slug, rarity, occurred_at, price, card.get("slug")),
        "player_slug": player_slug,
        "rarity": rarity,
        "season_year": season_year,
        "season_class": (
            ("IN_SEASON" if in_season else "CLASSIC")
            if in_season is not None
            else (
                "IN_SEASON"
                if season_year is not None and int(season_year) == current_season_year()
                else ("CLASSIC" if season_year is not None else "UNKNOWN")
            )
        ),
        "occurred_at": occurred_at,
        "eur": price,
        "wei": wei_of(node.get("amounts")),
        "sale_type": sale_type_of(node.get("deal")),
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
    minimal_query = render("token_prices_minimal")
    using_minimal = False
    positions = tracked_positions(connection, extra_slugs or [])
    observations: list[dict] = []
    failures: list[str] = []

    for player_slug, rarity in positions:
        variables = {
            "playerSlug": player_slug,
            "rarity": rarity_argument(rarity),
            "from": _since(connection, player_slug, rarity),
            "first": MAX_PRINTS_PER_CALL,
        }
        try:
            if using_minimal:
                data = client.execute(minimal_query, variables, operation_name="TokenPricesMinimal")
            else:
                try:
                    data = client.execute(query, variables, operation_name="TokenPrices")
                except SorareApiError as exc:
                    # One retry without the venue, then stay on the simpler
                    # query: whatever rejects it will reject it for everyone.
                    log.warning(
                        "Full price query rejected for %s/%s (%s); falling back to "
                        "dates and prices only for the rest of this run.",
                        player_slug, rarity, exc,
                    )
                    failures.append(f"{player_slug}/{rarity}: {exc}")
                    using_minimal = True
                    data = client.execute(minimal_query, variables, operation_name="TokenPricesMinimal")
        except BudgetExhausted:
            log.warning("Call budget spent after %d positions; the rest wait for the next run.", len(observations))
            break
        except SorareApiError as exc:
            failures.append(f"{player_slug}/{rarity}: {exc}")
            if len(failures) == 1:
                # Say what actually went wrong the first time. "Too many
                # failures" without the reason is useless in a log.
                log.error("tokenPrices rejected %s/%s: %s", player_slug, rarity, exc)
            if len(failures) > 10:
                log.error(
                    "Stopping the price tape after %d failures. First reason: %s",
                    len(failures), failures[0],
                )
                break
            continue

        for node in (data.get("tokens") or {}).get("tokenPrices") or []:
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
