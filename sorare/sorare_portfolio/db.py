"""SQLite access: connection, migrations, idempotent upserts."""

from __future__ import annotations

import hashlib
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator, Sequence

from .paths import DB_FILE, ensure_dirs

SCHEMA_SQL = Path(__file__).resolve().parent / "schema.sql"


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def natural_key(*parts: Any) -> str:
    """Stable hash of the identifying parts of a record.

    Used wherever the API gives no durable id (a completed sale, a floor
    snapshot), so the same fact seen twice is stored once.
    """
    joined = "|".join("" if part is None else str(part) for part in parts)
    return hashlib.sha1(joined.encode("utf-8")).hexdigest()[:24]


def connect(path: Path | None = None) -> sqlite3.Connection:
    ensure_dirs()
    connection = sqlite3.connect(path or DB_FILE)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


ADDED_COLUMNS = [
    ("player", "l5_api", "REAL"),
    ("player", "l15_api", "REAL"),
    ("player", "appearances_api", "INTEGER"),
]


def migrate(connection: sqlite3.Connection) -> None:
    connection.executescript(SCHEMA_SQL.read_text(encoding="utf-8"))
    # Columns added after a database was first created. SQLite has no
    # "ADD COLUMN IF NOT EXISTS", so the duplicate case is caught and ignored.
    for table, column, column_type in ADDED_COLUMNS:
        try:
            connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {column_type}")
        except sqlite3.OperationalError as exc:
            if "duplicate column" not in str(exc).lower():
                raise
    connection.commit()


@contextmanager
def session(path: Path | None = None) -> Iterator[sqlite3.Connection]:
    connection = connect(path)
    try:
        migrate(connection)
        yield connection
        connection.commit()
    finally:
        connection.close()


def upsert_many(
    connection: sqlite3.Connection,
    table: str,
    rows: Iterable[dict[str, Any]],
    *,
    key: str,
    update: Sequence[str] | None = None,
) -> int:
    """Insert rows, updating only the listed columns on conflict.

    Returns the number of rows that were genuinely new, which is what the
    refresh log reports (and what tells you whether an hourly run is
    actually catching new market prints).
    """
    rows = list(rows)
    if not rows:
        return 0

    before = connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    columns = list(rows[0].keys())
    placeholders = ", ".join(f":{column}" for column in columns)
    if update:
        assignments = ", ".join(f"{column} = excluded.{column}" for column in update)
        conflict = f"ON CONFLICT({key}) DO UPDATE SET {assignments}"
    else:
        conflict = f"ON CONFLICT({key}) DO NOTHING"

    connection.executemany(
        f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders}) {conflict}",
        rows,
    )
    after = connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    return after - before


def set_meta(connection: sqlite3.Connection, key: str, value: str) -> None:
    connection.execute(
        "INSERT INTO meta (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, value),
    )


def get_meta(connection: sqlite3.Connection, key: str, default: str | None = None) -> str | None:
    row = connection.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else default


def log_refresh(
    connection: sqlite3.Connection,
    *,
    run_id: str,
    module: str,
    started_at: str,
    rows_added: int,
    api_calls: int,
    status: str,
    message: str = "",
) -> None:
    connection.execute(
        "INSERT INTO refresh_log (run_id, module, started_at, finished_at, rows_added, "
        "api_calls, status, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (run_id, module, started_at, utcnow(), rows_added, api_calls, status, message[:500]),
    )
