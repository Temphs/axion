"""One full refresh: sign in, pull, transform, export, rebuild.

Every module is independent and every failure is contained, because an
unattended hourly run must never end with nothing written. A module that fails
is logged, reported at the end, and the rest of the run continues.
"""

from __future__ import annotations

import logging
import sqlite3
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Callable

from . import db
from .auth import AuthError, sign_in
from .client import BudgetExhausted, SorareClient
from .excel.build_workbook import build_workbook
from .excel.settings_sync import sync_settings
from .export.exporter import export_all
from .ingest.floors import ingest_floors
from .ingest.gallery import ingest_gallery
from .ingest.manual import ingest_manual
from .ingest.prices import ingest_prices
from .ingest.scores import ingest_scores
from .ingest.transactions import ingest_transactions
from .paths import LOG_DIR, RAW_DIR, ensure_dirs
from .settings import load_settings

log = logging.getLogger(__name__)

MODULES = ("gallery", "transactions", "prices", "floors", "scores")


@dataclass
class RunReport:
    run_id: str
    started_at: str
    results: dict[str, dict] = field(default_factory=dict)
    failures: dict[str, str] = field(default_factory=dict)
    api_calls: int = 0

    def render(self) -> str:
        lines = [f"Run {self.run_id} started {self.started_at}", "-" * 60]
        for module, result in self.results.items():
            summary = ", ".join(f"{key}={value}" for key, value in result.items() if key != "failures")
            lines.append(f"  OK      {module:<14} {summary}")
        for module, message in self.failures.items():
            lines.append(f"  FAILED  {module:<14} {message}")
        lines.append(f"  API calls used: {self.api_calls}")
        return "\n".join(lines)


def configure_logging(verbose: bool = False) -> None:
    ensure_dirs()
    log_file = LOG_DIR / f"update-{datetime.now(timezone.utc):%Y-%m-%d}.log"
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s | %(message)s",
        handlers=[logging.FileHandler(log_file, encoding="utf-8"), logging.StreamHandler()],
    )


def prune_raw_snapshots(retention_days: int) -> int:
    """Keep the raw API archive from growing without bound."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    removed = 0
    for path in RAW_DIR.glob("*.json.gz"):
        if datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc) < cutoff:
            path.unlink()
            removed += 1
    return removed


def _run_module(
    report: RunReport,
    connection: sqlite3.Connection,
    name: str,
    function: Callable[[], dict],
) -> None:
    started = db.utcnow()
    try:
        result = function()
        report.results[name] = result
        db.log_refresh(
            connection, run_id=report.run_id, module=name, started_at=started,
            rows_added=int(sum(value for key, value in result.items() if key.endswith("new") and isinstance(value, int))),
            api_calls=0, status="OK",
        )
    except BudgetExhausted as exc:
        report.failures[name] = str(exc)
        db.log_refresh(connection, run_id=report.run_id, module=name, started_at=started,
                       rows_added=0, api_calls=0, status="BUDGET", message=str(exc))
    except Exception as exc:  # a failing module must not take the run down
        log.exception("Module %s failed", name)
        report.failures[name] = str(exc)
        db.log_refresh(connection, run_id=report.run_id, module=name, started_at=started,
                       rows_added=0, api_calls=0, status="FAILED", message=str(exc))
    connection.commit()


def run_update(
    *,
    modules: tuple[str, ...] = MODULES,
    interactive: bool = True,
    rebuild_workbook: bool = True,
) -> RunReport:
    report = RunReport(run_id=uuid.uuid4().hex[:8], started_at=db.utcnow())

    # The workbook is the interface for settings, so read it before anything
    # downstream uses an assumption.
    try:
        sync_settings()
    except Exception as exc:
        log.warning("Could not sync settings from the workbook: %s", exc)

    settings = load_settings()
    ingest_config = settings["ingest"]

    with db.session() as connection:
        _run_module(report, connection, "manual_files", lambda: ingest_manual(connection))

        credentials = None
        try:
            credentials = sign_in(interactive=interactive)
        except AuthError as exc:
            report.failures["auth"] = str(exc)
            log.error("Authentication failed: %s", exc)

        if credentials:
            client = SorareClient(credentials, max_calls=int(ingest_config["max_api_calls_per_run"]))
            runners: dict[str, Callable[[], dict]] = {
                "gallery": lambda: ingest_gallery(client, connection),
                "transactions": lambda: ingest_transactions(client, connection),
                "prices": lambda: ingest_prices(
                    client, connection, extra_slugs=list(ingest_config["extra_player_slugs"])
                ),
                "floors": lambda: ingest_floors(client, connection),
                "scores": lambda: ingest_scores(client, connection),
            }
            for name in modules:
                if name in runners:
                    _run_module(report, connection, name, runners[name])
            report.api_calls = client.calls_made

        _run_module(report, connection, "export", lambda: export_all(connection))
        db.set_meta(connection, "last_run_at", db.utcnow())
        db.set_meta(connection, "last_run_id", report.run_id)

    removed = prune_raw_snapshots(int(ingest_config["raw_snapshot_retention_days"]))
    if removed:
        log.info("Pruned %d raw snapshots older than the retention window", removed)

    if rebuild_workbook:
        try:
            build_workbook()
        except PermissionError:
            log.error(
                "The workbook is open in Excel, so it could not be rebuilt. Close it and run "
                "the updater again (or use Refresh All if you enabled Power Query)."
            )
            report.failures["workbook"] = "workbook open in Excel"
        except Exception as exc:
            log.exception("Workbook build failed")
            report.failures["workbook"] = str(exc)

    return report
