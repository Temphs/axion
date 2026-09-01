"""Reward cards, detected from the gallery rather than from a guessed field.

Sorare documents no reward fields publicly, so the reward *feed* is still
unwired. But a reward card is visible in the gallery anyway: it arrived with no
purchase price. That is enough to list every reward card you hold, date it, and
price it at today's market - without inventing an API field.

Two things this deliberately does not do:

* It does not guess what the card was worth when you received it. That value is
  left empty, so a reward card never inflates "total rewards earned" with a
  number nobody measured. Fill it in on the Rewards sheet if you know it.
* It does not claim crafted cards as rewards. A card named as the output of a
  craft in your Essence ledger belongs to the Essence sheet, and counting it in
  both places would double it.
"""

from __future__ import annotations

import logging
import sqlite3

from .. import db

log = logging.getLogger(__name__)

DERIVED_SOURCE = "gallery"


def derive_reward_cards(connection: sqlite3.Connection) -> int:
    """Add a reward row for every zero-cost card in the gallery. Idempotent."""
    craft_outputs = {
        row["card_slug"]
        for row in connection.execute(
            "SELECT DISTINCT card_slug FROM essence_event WHERE card_slug IS NOT NULL AND card_slug <> ''"
        )
    }
    already_recorded = {
        row["card_slug"]
        for row in connection.execute(
            "SELECT DISTINCT card_slug FROM reward "
            "WHERE card_slug IS NOT NULL AND IFNULL(source, '') <> ?",
            (DERIVED_SOURCE,),
        )
    }

    candidates = connection.execute(
        "SELECT slug, acquired_at, rarity FROM card "
        "WHERE acquired_at IS NOT NULL "
        "AND (acquisition_type = 'REWARD_OR_CRAFT' OR acquisition_type = 'REWARD' "
        "     OR IFNULL(acquisition_eur, 0) = 0)"
    ).fetchall()

    rows = [
        {
            "reward_key": db.natural_key(DERIVED_SOURCE, row["slug"]),
            "received_at": row["acquired_at"],
            "gameweek": None,
            "competition": None,
            "lineup": None,
            "scarcity": row["rarity"],
            "cash_eur": 0.0,
            "card_slug": row["slug"],
            "card_value_at_receipt": None,
            "essence_amount": 0.0,
            "essence_scarcity": None,
            "xp_amount": 0.0,
            "source": DERIVED_SOURCE,
        }
        for row in candidates
        if row["slug"] not in craft_outputs and row["slug"] not in already_recorded
    ]

    added = db.upsert_many(connection, "reward", rows, key="reward_key")
    if added:
        log.info("Detected %d reward cards in the gallery", added)
    return added
