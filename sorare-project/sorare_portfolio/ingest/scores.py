"""Player form, from the per-match score list.

`Player.so5Scores(last: 40)` returns the individual match scores, so L5, L10 and
L40 are all derived from one source and cannot disagree with each other, and the
starter share is real (minutes played and whether the player started) rather
than a proxy.

Players are fetched in batches: one call covers many players, which keeps a
hundred-card gallery inside a handful of requests.
"""

from __future__ import annotations

import logging
import sqlite3
from typing import Any

from .. import db
from ..client import BudgetExhausted, SorareApiError, SorareClient
from .common import iso, render

log = logging.getLogger(__name__)

# The API charges query complexity on the requested page size, so keep batches
# modest: 25 players x 40 scores is comfortably inside the authenticated limit.
BATCH_SIZE = 25
SCORES_PER_PLAYER = 40


def _score_rows(player: dict[str, Any]) -> list[dict]:
    slug = player.get("slug")
    rows = []
    for index, entry in enumerate(player.get("so5Scores") or []):
        if not entry:
            continue
        game = entry.get("game") or {}
        stats = entry.get("playerGameStats") or {}
        played_at = iso(game.get("date"))
        rows.append(
            {
                # Two matches can share a date for a player in theory, so the
                # position in the returned list keeps the key unique.
                "score_key": db.natural_key("so5", slug, played_at, index),
                "player_slug": slug,
                "played_at": played_at,
                "competition": None,
                "score": entry.get("score"),
                "minutes": stats.get("minsPlayed"),
                "started": 1 if stats.get("gameStarted") else 0,
                "opponent": None,
            }
        )
    return rows


def ingest_scores(client: SorareClient, connection: sqlite3.Connection) -> dict[str, int]:
    query = render("player_scores")
    slugs = [
        row["player_slug"]
        for row in connection.execute(
            "SELECT DISTINCT player_slug FROM card WHERE owned = 1 AND player_slug IS NOT NULL"
        )
    ]
    if not slugs:
        return {"players": 0, "scores_new": 0}

    rows: list[dict] = []
    seen_players = 0
    for start in range(0, len(slugs), BATCH_SIZE):
        batch = slugs[start : start + BATCH_SIZE]
        try:
            data = client.execute(query, {"slugs": batch}, operation_name="PlayerScores")
        except BudgetExhausted:
            log.warning("Call budget spent; the remaining players wait for the next run.")
            break
        except SorareApiError as exc:
            log.warning("Player scores unavailable (%s); skipping the rest.", exc)
            break
        for player in data.get("players") or []:
            seen_players += 1
            rows.extend(_score_rows(player))

    added = db.upsert_many(
        connection, "player_score", rows, key="score_key",
        update=["score", "minutes", "started", "played_at"],
    )
    db.set_meta(connection, "scores_last_refresh", db.utcnow())
    log.info("Player form: %d players, %d new match scores", seen_players, added)
    return {"players": seen_players, "scores_new": added}
