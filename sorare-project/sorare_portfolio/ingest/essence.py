"""Essence, which Sorare calls card shards.

Two feeds, and they answer different questions:

* `cardShardsHistoryTransactions` is the ledger - every credit and debit, per
  rarity, with the source named by the entry's type: a gameweek reward, a craft
  pull, a rejected craft, a task, a bid. That is what fills the Essence sheet.
* `cardShardsChests` is the balance you hold right now, per rarity.

What the API does not give is the *outcome* of a craft in the same record - the
card you pulled and what it turned out to be worth. Those cards do arrive in
your gallery marked SHARDS, so they are valued by the same engine as everything
else; linking a specific pull to a specific card is still a manual line in
manual/essence_log.csv if you want that precision.
"""

from __future__ import annotations

import logging
import sqlite3
from typing import Any

from .. import db
from ..client import BudgetExhausted, SorareApiError, SorareClient
from .common import iso, render

log = logging.getLogger(__name__)

RARITIES = ("limited", "rare")
# CREDIT is Essence arriving, DEBIT is Essence spent.
FEEDS = (("CREDIT", "EARN"), ("DEBIT", "SPEND"))

# The entry's GraphQL type names where the Essence came from or went.
SOURCE_LABELS = {
    "So5RewardSource": "gameweek reward",
    "So5LeaderboardEntryItemSource": "leaderboard reward",
    "CardPullSource": "craft pull",
    "RejectedCraftSource": "rejected craft",
    "TaskSource": "task",
    "BidSource": "auction bid",
    "EnglishAuctionSource": "auction",
    "PrimaryOfferSource": "instant buy",
    "PackSource": "pack",
    "CardSource": "card",
    "PrintablePlayerSource": "printable player",
    "ProbabilisticBundleSource": "bundle",
    "InGameCurrencySource": "in-game currency",
    "UnknownSource": "unknown",
}


def _event(node: dict[str, Any], rarity: str, direction: str) -> dict | None:
    quantity = node.get("totalQuantity")
    occurred_on = iso(node.get("date"))
    if not quantity or not occurred_on:
        return None

    flavours = node.get("quantityByFlavour") or []
    flavour = ", ".join(
        f"{item.get('displayName')} ({item.get('count')})" for item in flavours if item.get("displayName")
    )
    kind = node.get("__typename", "")
    return {
        "event_key": "api-" + db.natural_key("shards", rarity, direction, node.get("id"), occurred_on),
        "occurred_on": occurred_on[:10],
        "direction": direction,
        "source": SOURCE_LABELS.get(kind, kind or "unknown"),
        "scarcity": rarity.upper(),
        "flavor": flavour or None,
        "amount": float(quantity),
        # A craft pull is the debit side of a craft, so its quantity is the cost.
        "craft_type": node.get("label"),
        "base_cost": float(quantity) if direction == "SPEND" else 0.0,
        "clue_cost": 0.0,
        "draw_type": node.get("label"),
        "card_slug": None,
        "card_tier": None,
        "card_value": None,
        "notes": node.get("description"),
    }


def ingest_essence(client: SorareClient, connection: sqlite3.Connection) -> dict[str, Any]:
    query = render("essence_history")
    events: list[dict] = []
    failures: list[str] = []

    for rarity in RARITIES:
        for filter_by, direction in FEEDS:
            try:
                for node in client.paginate(
                    query,
                    {"rarity": rarity, "sport": "FOOTBALL", "filterBy": filter_by},
                    path=("currentUser", "cardShardsHistoryTransactions"),
                    operation_name="EssenceHistory",
                    page_limit=20,
                ):
                    event = _event(node, rarity, direction)
                    if event:
                        events.append(event)
            except BudgetExhausted:
                raise
            except SorareApiError as exc:
                failures.append(f"{rarity}/{filter_by}: {exc}")

    # Rows typed into manual/essence_log.csv are the user's own and must survive
    # a refresh, so only rows this module wrote are cleared.
    connection.execute("DELETE FROM essence_event WHERE event_key LIKE 'api-%'")
    added = db.upsert_many(connection, "essence_event", events, key="event_key")

    balances = {}
    try:
        chests = client.execute(render("essence_chests"), {}, operation_name="EssenceChests")
        for chest in (chests.get("currentUser") or {}).get("cardShardsChests") or []:
            rarity = str(chest.get("rarity") or "").lower()
            balances[rarity] = chest.get("cardShardsCount")
            db.set_meta(connection, f"essence_balance_{rarity}", str(chest.get("cardShardsCount")))
    except SorareApiError as exc:
        failures.append(f"chests: {exc}")

    db.set_meta(connection, "essence_last_refresh", db.utcnow())
    log.info("Essence: %d ledger entries, balances %s", len(events), balances)
    return {"events": len(events), "events_new": added, "balances": balances, "failures": failures}
