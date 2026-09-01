"""Rate-limited, retrying GraphQL client for the Sorare API.

Everything the ingest layer knows about HTTP lives here: the documented rate
limits (20/60/200 calls per minute), the 429 Retry-After contract, cursor
pagination, a hard per-run call budget so a scheduled task can never run away,
and an optional raw-response archive for auditing what the API actually said.
"""

from __future__ import annotations

import gzip
import json
import logging
import time
from collections import deque
from datetime import datetime, timezone
from typing import Any, Iterator

import requests

from .auth import API_URL, Credentials
from .paths import QUERY_DIR, RAW_DIR

log = logging.getLogger(__name__)

# Documented ceilings, minus a margin so a burst never trips the limiter.
CALLS_PER_MINUTE_WITH_KEY = 200
CALLS_PER_MINUTE_AUTHENTICATED = 60
SAFETY_FACTOR = 0.8

MAX_ATTEMPTS = 5


class BudgetExhausted(RuntimeError):
    """The per-run API call budget is spent. Not an error: a stop signal."""


class SorareApiError(RuntimeError):
    pass


class RateLimiter:
    """Sliding-window limiter over the last 60 seconds."""

    def __init__(self, calls_per_minute: int) -> None:
        self.limit = max(1, int(calls_per_minute * SAFETY_FACTOR))
        self._calls: deque[float] = deque()

    def acquire(self) -> None:
        now = time.monotonic()
        while self._calls and now - self._calls[0] > 60:
            self._calls.popleft()
        if len(self._calls) >= self.limit:
            sleep_for = 60 - (now - self._calls[0]) + 0.05
            log.debug("Rate limit reached, sleeping %.1fs", sleep_for)
            time.sleep(max(0.0, sleep_for))
            return self.acquire()
        self._calls.append(now)


def load_query(name: str) -> str:
    """Read a .graphql file from sorare_portfolio/queries."""
    path = QUERY_DIR / f"{name}.graphql"
    if not path.exists():
        raise FileNotFoundError(f"GraphQL query not found: {path}")
    return path.read_text(encoding="utf-8")


class SorareClient:
    def __init__(
        self,
        credentials: Credentials,
        *,
        max_calls: int = 900,
        archive_raw: bool = True,
    ) -> None:
        self.credentials = credentials
        self.session = requests.Session()
        self.session.headers.update(credentials.headers())
        self.limiter = RateLimiter(
            CALLS_PER_MINUTE_WITH_KEY if credentials.api_key else CALLS_PER_MINUTE_AUTHENTICATED
        )
        self.max_calls = max_calls
        self.calls_made = 0
        self.archive_raw = archive_raw

    # ---------------------------------------------------------------- execute

    def execute(
        self,
        query: str,
        variables: dict[str, Any] | None = None,
        *,
        operation_name: str | None = None,
        snapshot: str | None = None,
        tolerate_errors: bool = False,
    ) -> dict[str, Any]:
        if self.calls_made >= self.max_calls:
            raise BudgetExhausted(
                f"Per-run API call budget ({self.max_calls}) reached. "
                "Raise ingest.max_api_calls_per_run in config/settings.yml if this is expected."
            )

        payload: dict[str, Any] = {"query": query}
        if variables:
            payload["variables"] = variables
        if operation_name:
            payload["operationName"] = operation_name

        for attempt in range(1, MAX_ATTEMPTS + 1):
            self.limiter.acquire()
            self.calls_made += 1
            try:
                response = self.session.post(API_URL, json=payload, timeout=90)
            except requests.RequestException as exc:
                if attempt == MAX_ATTEMPTS:
                    raise SorareApiError(f"Network failure calling Sorare: {exc}") from exc
                time.sleep(2**attempt)
                continue

            if response.status_code == 429:
                wait = float(response.headers.get("Retry-After", 2**attempt))
                log.warning("Rate limited by Sorare, waiting %.0fs (attempt %d)", wait, attempt)
                time.sleep(wait + 0.5)
                continue

            if response.status_code == 413:
                raise SorareApiError(
                    "Sorare rejected the request as too large (413). Reduce the page size "
                    "for this query."
                )

            if response.status_code in (500, 502, 503, 504):
                if attempt == MAX_ATTEMPTS:
                    raise SorareApiError(f"Sorare returned {response.status_code} repeatedly.")
                time.sleep(2**attempt)
                continue

            if response.status_code == 401:
                raise SorareApiError(
                    "Sorare rejected the token (401). Delete data/auth_token.json and run the "
                    "updater by hand to sign in again."
                )

            response.raise_for_status()
            body = response.json()

            if snapshot and self.archive_raw:
                self._archive(snapshot, body)

            errors = body.get("errors")
            data = body.get("data")
            if errors and (data is None or not tolerate_errors):
                messages = "; ".join(error.get("message", "?") for error in errors)
                raise SorareApiError(f"GraphQL error: {messages}")
            if errors:
                log.warning(
                    "Partial GraphQL response (%s). Continuing with what was returned.",
                    "; ".join(error.get("message", "?") for error in errors),
                )
            return data or {}

        raise SorareApiError("Exhausted retries against the Sorare API.")

    # -------------------------------------------------------------- paginate

    def paginate(
        self,
        query: str,
        variables: dict[str, Any],
        *,
        path: tuple[str, ...],
        operation_name: str | None = None,
        snapshot: str | None = None,
        page_limit: int = 200,
    ) -> Iterator[dict[str, Any]]:
        """Walk a cursor-paginated connection, yielding nodes.

        `path` addresses the connection inside the response, e.g.
        ("currentUser", "cards"). Stops at page_limit pages as a runaway guard.
        """
        cursor: str | None = None
        for page in range(page_limit):
            page_vars = dict(variables, cursor=cursor)
            data = self.execute(
                query,
                page_vars,
                operation_name=operation_name,
                snapshot=f"{snapshot}-p{page}" if snapshot else None,
            )
            node: Any = data
            for key in path:
                if node is None:
                    break
                node = node.get(key)
            if not node:
                return
            yield from (node.get("nodes") or [])
            page_info = node.get("pageInfo") or {}
            cursor = page_info.get("endCursor")
            if not page_info.get("hasNextPage", bool(cursor)) or not cursor:
                return

    # --------------------------------------------------------------- archive

    def _archive(self, name: str, body: dict[str, Any]) -> None:
        RAW_DIR.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
        target = RAW_DIR / f"{stamp}-{name}.json.gz"
        with gzip.open(target, "wt", encoding="utf-8") as handle:
            json.dump(body, handle)
