"""Your Sorare cash balance, read from the API rather than typed in.

The Settings sheet keeps its cash cell as an override for anyone who wants one,
but when this module succeeds the dashboard uses the live figure and says so.
"""

from __future__ import annotations

import logging
import sqlite3

from .. import db
from ..client import SorareClient
from .common import money_eur, render

log = logging.getLogger(__name__)


def ingest_balance(client: SorareClient, connection: sqlite3.Connection) -> dict[str, float | None]:
    data = client.execute(render("balances"), {}, operation_name="Balances")
    balances = ((data.get("currentUser") or {}).get("availableBalances") or {})
    cash = money_eur(balances.get("eurCents"))
    if cash is None:
        log.info("No EUR balance returned; the Settings sheet value stays in charge.")
        return {"cash_balance_eur": None}

    db.set_meta(connection, "cash_balance_eur", str(cash))
    db.set_meta(connection, "cash_balance_at", db.utcnow())
    log.info("Cash balance: %.2f EUR", cash)
    return {"cash_balance_eur": cash}
