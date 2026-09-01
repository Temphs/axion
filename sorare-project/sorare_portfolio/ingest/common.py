"""Shared helpers for turning Sorare API payloads into rows.

Two conventions are documented here because they are the easiest thing in the
whole project to get quietly wrong:

* Monetary amounts. Sorare returns fiat amounts in minor units (cents), so 12500
  means EUR 125.00. Everything downstream stores and displays major units.
* Season class. A card is In-Season when its season year matches the football
  season currently running (which starts in August), otherwise Classic. When the
  schema exposes an explicit eligibility flag the doctor enables it and that
  flag wins.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from ..client import load_query
from ..schema_doctor import load_capabilities, strip_optional

TRANSFER_TYPE_MAP = {
    # Sorare's own vocabulary -> the five transaction types on the Transactions
    # sheet. Anything unrecognised is kept verbatim rather than silently binned.
    "TOKEN_AUCTION": "AUCTION",
    "TOKENAUCTION": "AUCTION",
    "AUCTION": "AUCTION",
    "ENGLISH_AUCTION": "AUCTION",
    "TOKEN_PRIMARY_OFFER": "INSTANT_BUY",
    "TOKENPRIMARYOFFER": "INSTANT_BUY",
    "PRIMARY_OFFER": "INSTANT_BUY",
    "INSTANT_BUY": "INSTANT_BUY",
    "SINGLE_SALE_OFFER": "MANAGER_SALE",
    "SINGLESALEOFFER": "MANAGER_SALE",
    "SINGLE_BUY_OFFER": "ACCEPTED_BUY_OFFER",
    "SINGLEBUYOFFER": "ACCEPTED_BUY_OFFER",
    "DIRECT_OFFER": "DIRECT_OFFER",
    "DIRECTOFFER": "DIRECT_OFFER",
    "REWARD": "REWARD",
    "CLAIM": "REWARD",
}


def render(name: str) -> str:
    """Load a query with the fields the schema doctor disabled removed."""
    capabilities = load_capabilities()
    return strip_optional(load_query(name), capabilities.get("disabled_fields", []))


def money_eur(amounts: dict[str, Any] | None) -> float | None:
    """EUR major units from a Sorare amounts object (which uses cents)."""
    if not amounts:
        return None
    value = amounts.get("eur")
    if value is None:
        return None
    try:
        return round(float(value) / 100.0, 2)
    except (TypeError, ValueError):
        return None


def wei_of(amounts: dict[str, Any] | None) -> str | None:
    return (amounts or {}).get("wei")


def current_season_year(now: datetime | None = None) -> int:
    now = now or datetime.now(timezone.utc)
    return now.year if now.month >= 8 else now.year - 1


def season_class(card: dict[str, Any], now: datetime | None = None) -> str:
    explicit = card.get("inSeasonEligible")
    if explicit is not None:
        return "IN_SEASON" if explicit else "CLASSIC"
    season = card.get("seasonYear")
    if season is None:
        return "UNKNOWN"
    return "IN_SEASON" if int(season) == current_season_year(now) else "CLASSIC"


def normalise_type(raw: str | None, default: str = "UNKNOWN") -> str:
    if not raw:
        return default
    key = str(raw).strip().upper().replace("-", "_")
    return TRANSFER_TYPE_MAP.get(key, key)


def rarity_of(card: dict[str, Any]) -> str:
    return str(card.get("rarityTyped") or card.get("rarity") or "unknown").lower()


def iso(value: Any) -> str | None:
    """Normalise whatever timestamp shape the API returns to ISO-8601 UTC."""
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=timezone.utc).isoformat(timespec="seconds")
    text = str(value).replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return str(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat(timespec="seconds")


def player_row(player: dict[str, Any] | None, team: dict[str, Any] | None = None) -> dict | None:
    if not player or not player.get("slug"):
        return None
    club = player.get("activeClub") or team or {}
    return {
        "slug": player["slug"],
        "display_name": player.get("displayName"),
        "club_slug": club.get("slug"),
        "club_name": club.get("name"),
        "league": club.get("domesticLeague", {}).get("displayName")
        if isinstance(club.get("domesticLeague"), dict)
        else None,
        "position": None,
        "age": player.get("age"),
    }
