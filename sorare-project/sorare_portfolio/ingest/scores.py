"""Player form.

Sorare documents no scoring fields publicly, so this module is deliberately
tolerant: it asks for the aggregates its query still contains after the schema
doctor has pruned it, and writes whatever came back. If nothing survived, the
form columns stay empty rather than showing invented numbers.
"""

from __future__ import annotations

import logging
import sqlite3

from .. import db
from ..client import BudgetExhausted, SorareApiError, SorareClient
from .common import render

log = logging.getLogger(__name__)


def ingest_scores(client: SorareClient, connection: sqlite3.Connection) -> dict[str, int]:
    query = render("player_scores")
    if "lastF" not in query:
        log.info("No form fields available in this schema; skipping player scores.")
        return {"players_updated": 0, "skipped": 1}

    slugs = [
        row["player_slug"]
        for row in connection.execute(
            "SELECT DISTINCT player_slug FROM card WHERE owned = 1 AND player_slug IS NOT NULL"
        )
    ]
    updated = 0
    for slug in slugs:
        try:
            data = client.execute(query, {"slug": slug}, operation_name="PlayerScores")
        except BudgetExhausted:
            break
        except SorareApiError as exc:
            log.warning("Player form unavailable (%s); skipping the rest.", exc)
            break
        player = data.get("player") or {}
        if not player:
            continue
        connection.execute(
            "UPDATE player SET l5_api = ?, l15_api = ?, appearances_api = ?, updated_at = ? "
            "WHERE slug = ?",
            (
                player.get("lastFiveSo5AverageScore"),
                player.get("lastFifteenSo5AverageScore"),
                player.get("lastFifteenSo5Appearances"),
                db.utcnow(),
                slug,
            ),
        )
        updated += 1
    db.set_meta(connection, "scores_last_refresh", db.utcnow())
    return {"players_updated": updated, "skipped": 0}
