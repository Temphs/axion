"""The three files you maintain by hand, and their templates.

Sorare's public API documents nothing for Essence, and no reliable feed for
fiat deposits and withdrawals, so those come from small CSVs. They are read on
every run, validated, and merged into the same database as the API data - so
the dashboard treats them identically.
"""

from __future__ import annotations

import csv
import logging
import sqlite3
from pathlib import Path
from typing import Any

from .. import db
from ..paths import CASH_FLOWS_CSV, ESSENCE_CSV, INVESTMENTS_CSV

log = logging.getLogger(__name__)

TEMPLATES: dict[Path, tuple[list[str], list[str], str]] = {
    CASH_FLOWS_CSV: (
        ["date", "direction", "amount_eur", "method", "notes"],
        ["2025-01-15", "DEPOSIT", "250.00", "card", "example row - delete me"],
        "Every euro in and out of Sorare. direction is DEPOSIT or WITHDRAWAL.",
    ),
    ESSENCE_CSV: (
        [
            "date", "direction", "source", "scarcity", "flavor", "amount", "craft_type",
            "base_cost", "clue_cost", "draw_type", "card_slug", "card_tier", "card_value", "notes",
        ],
        [
            "2025-01-20", "SPEND", "craft", "LIMITED", "Premier League", "1000", "standard",
            "1000", "150", "Full Roster", "", "", "", "example row - delete me",
        ],
        "Essence earned (direction EARN) and spent on crafts (direction SPEND). "
        "Fill card_slug when a craft produced a card and its value is priced automatically.",
    ),
    INVESTMENTS_CSV: (
        [
            "player_slug", "player_name", "rarity", "quantity", "avg_entry", "target_price",
            "downside_price", "thesis", "catalyst", "catalyst_date", "status",
            "bear_prob", "bear_price", "base_prob", "base_price",
            "bull_prob", "bull_price", "extreme_prob", "extreme_price", "notes",
        ],
        [
            "example-player", "Example Player", "limited", "3", "12.00", "30.00", "8.00",
            "Regains the starting goalkeeper role", "New manager appointed", "2025-03-01", "OPEN",
            "0.25", "8.00", "0.45", "18.00", "0.25", "30.00", "0.05", "60.00",
            "example row - delete me",
        ],
        "Probabilities are fractions and should sum to 1 across the four scenarios.",
    ),
}


def write_templates(force: bool = False) -> list[Path]:
    written = []
    for path, (header, example, note) in TEMPLATES.items():
        if path.exists() and not force:
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", newline="", encoding="utf-8") as handle:
            handle.write(f"# {note}\n")
            writer = csv.writer(handle)
            writer.writerow(header)
            writer.writerow(example)
        written.append(path)
    return written


def _rows(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        lines = [line for line in handle if not line.lstrip().startswith("#")]
    rows = list(csv.DictReader(lines))
    return [
        row
        for row in rows
        if any((value or "").strip() for value in row.values())
        and "example row - delete me" not in (row.get("notes") or "")
    ]


def _number(value: Any, default: float | None = None) -> float | None:
    text = str(value or "").strip().replace(",", ".").replace("€", "")
    if not text:
        return default
    try:
        return float(text)
    except ValueError:
        return default


def ingest_manual(connection: sqlite3.Connection) -> dict[str, int]:
    write_templates()
    counts: dict[str, int] = {}

    flows = [
        {
            "flow_key": db.natural_key("flow", row.get("date"), row.get("direction"), row.get("amount_eur"), index),
            "occurred_on": (row.get("date") or "").strip(),
            "direction": (row.get("direction") or "").strip().upper(),
            "amount_eur": _number(row.get("amount_eur"), 0.0),
            "method": row.get("method"),
            "notes": row.get("notes"),
        }
        for index, row in enumerate(_rows(CASH_FLOWS_CSV))
    ]
    counts["cash_flows"] = len(flows)
    connection.execute("DELETE FROM cash_flow")
    db.upsert_many(connection, "cash_flow", flows, key="flow_key")

    essence = [
        {
            "event_key": "man-" + db.natural_key("essence", row.get("date"), row.get("direction"), row.get("amount"), index),
            "occurred_on": (row.get("date") or "").strip(),
            "direction": (row.get("direction") or "").strip().upper(),
            "source": row.get("source"),
            "scarcity": (row.get("scarcity") or "").strip().upper(),
            "flavor": row.get("flavor"),
            "amount": _number(row.get("amount"), 0.0),
            "craft_type": row.get("craft_type"),
            "base_cost": _number(row.get("base_cost"), 0.0),
            "clue_cost": _number(row.get("clue_cost"), 0.0),
            "draw_type": row.get("draw_type"),
            "card_slug": (row.get("card_slug") or "").strip() or None,
            "card_tier": row.get("card_tier"),
            "card_value": _number(row.get("card_value")),
            "notes": row.get("notes"),
        }
        for index, row in enumerate(_rows(ESSENCE_CSV))
    ]
    counts["essence_events"] = len(essence)
    # Only the hand-typed rows: the Essence ledger pulled from Sorare lives in
    # the same table under an "api-" key and must not be wiped by this.
    connection.execute("DELETE FROM essence_event WHERE event_key LIKE 'man-%' OR event_key NOT LIKE 'api-%'")
    db.upsert_many(connection, "essence_event", essence, key="event_key")

    investments = [
        {
            "investment_key": db.natural_key("inv", row.get("player_slug"), row.get("rarity"), index),
            "player_slug": (row.get("player_slug") or "").strip(),
            "player_name": row.get("player_name"),
            "rarity": (row.get("rarity") or "").strip().lower(),
            "quantity": _number(row.get("quantity"), 0.0),
            "avg_entry": _number(row.get("avg_entry")),
            "target_price": _number(row.get("target_price")),
            "downside_price": _number(row.get("downside_price")),
            "thesis": row.get("thesis"),
            "catalyst": row.get("catalyst"),
            "catalyst_date": row.get("catalyst_date"),
            "status": (row.get("status") or "OPEN").strip().upper(),
            "bear_prob": _number(row.get("bear_prob"), 0.0),
            "bear_price": _number(row.get("bear_price")),
            "base_prob": _number(row.get("base_prob"), 0.0),
            "base_price": _number(row.get("base_price")),
            "bull_prob": _number(row.get("bull_prob"), 0.0),
            "bull_price": _number(row.get("bull_price")),
            "extreme_prob": _number(row.get("extreme_prob"), 0.0),
            "extreme_price": _number(row.get("extreme_price")),
            "notes": row.get("notes"),
        }
        for index, row in enumerate(_rows(INVESTMENTS_CSV))
    ]
    counts["investments"] = len(investments)
    connection.execute("DELETE FROM investment")
    db.upsert_many(connection, "investment", investments, key="investment_key")

    log.info("Manual files: %s", counts)
    return counts
