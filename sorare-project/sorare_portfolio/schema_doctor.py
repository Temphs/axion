"""Schema doctor: check this project's queries against the real Sorare schema.

Sorare disabled GraphQL introspection in February 2025, so the schema is a file
you download once:

    curl -o config/schema.graphql https://api.sorare.com/graphql/schema

The doctor then does three things:

1. Validates every query in sorare_portfolio/queries against that schema.
2. Where a query only fails because of an optional field (a line tagged
   "# @opt Key"), it disables that field and revalidates, so the query still
   runs with everything the schema does support.
3. Discovers what the schema offers for the areas Sorare does not document -
   rewards, essence, balances, player scores - and prints the real field names,
   so those modules get wired to fields that exist rather than to guesses.

The result is written to config/schema_capabilities.json and read by the client
at query-render time.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from typing import Iterable

import requests
from graphql import build_schema, parse, validate
from graphql.error import GraphQLError

from .paths import CAPABILITIES_FILE, CONFIG_DIR, QUERY_DIR

SCHEMA_FILE = CONFIG_DIR / "schema.graphql"
SCHEMA_URL = "https://api.sorare.com/graphql/schema"


class SchemaDownloadError(RuntimeError):
    pass


def download_schema(destination=SCHEMA_FILE, *, timeout: int = 180) -> int:
    """Fetch Sorare's published schema. No login needed - it is a public file.

    Saving it from a browser is easy to get subtly wrong (Windows appends .txt,
    or the page is saved as HTML), so the project fetches it itself.
    """
    headers = {"Accept": "text/plain"}
    api_key = os.environ.get("SORARE_API_KEY", "").strip()
    if api_key:
        headers["APIKEY"] = api_key

    try:
        response = requests.get(SCHEMA_URL, headers=headers, timeout=timeout)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise SchemaDownloadError(
            f"Could not download the schema from {SCHEMA_URL}: {exc}\n"
            "Check your internet connection, or save that address in your browser as "
            f"{destination} and run this again."
        ) from exc

    text = response.text
    # A captive portal or an error page would happily return 200 and HTML.
    if "type Query" not in text:
        raise SchemaDownloadError(
            f"{SCHEMA_URL} returned something that is not a GraphQL schema "
            f"({len(text)} characters). Try again in a minute."
        )

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(text, encoding="utf-8")
    return len(text)

OPT_PATTERN = re.compile(r"#\s*@opt\s+(?P<key>[\w.]+)\s*$")

DISCOVERY_TOPICS: dict[str, tuple[str, ...]] = {
    "rewards": ("reward", "so5reward", "claim"),
    "essence": ("essence", "craft", "shard"),
    "balances": ("balance", "wallet", "deposit", "withdrawal"),
    "scores": ("score", "appearance", "so5score", "playerseason"),
    "collections": ("collection", "bonus", "xp", "level"),
}


@dataclass
class QueryReport:
    name: str
    ok: bool
    disabled: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def strip_optional(text: str, disabled: Iterable[str]) -> str:
    """Remove optional lines whose capability key is disabled."""
    disabled = set(disabled)
    kept: list[str] = []
    for line in text.splitlines():
        match = OPT_PATTERN.search(line)
        if match and match.group("key") in disabled:
            continue
        kept.append(line)
    return "\n".join(kept)


def optional_keys(text: str) -> dict[str, str]:
    """Map capability key -> the field name it guards, for every optional line."""
    keys: dict[str, str] = {}
    for line in text.splitlines():
        match = OPT_PATTERN.search(line)
        if not match:
            continue
        body = line[: match.start()].strip()
        field_name = body.split("{")[0].split("(")[0].strip()
        keys[match.group("key")] = field_name
    return keys


def _error_text(errors: list[GraphQLError]) -> list[str]:
    return [error.message for error in errors]


def check_query(schema, name: str, text: str) -> QueryReport:
    guards = optional_keys(text)
    disabled: list[str] = []

    for _ in range(len(guards) + 1):
        rendered = strip_optional(text, disabled)
        try:
            document = parse(rendered)
        except GraphQLError as exc:
            return QueryReport(name, False, disabled, [f"cannot parse query: {exc.message}"])
        errors = validate(schema, document)
        if not errors:
            return QueryReport(name, True, disabled, [])

        messages = _error_text(errors)
        newly_disabled = [
            key
            for key, field_name in guards.items()
            if key not in disabled
            and any(f"'{field_name}'" in message for message in messages)
        ]
        if not newly_disabled:
            return QueryReport(name, False, disabled, messages)
        disabled.extend(newly_disabled)

    return QueryReport(name, False, disabled, ["could not satisfy the schema"])


def discover(schema_text: str) -> dict[str, list[str]]:
    """Field names in the schema matching each topic keyword.

    Deliberately textual: the point is to surface real names for areas Sorare
    does not document, not to prove their semantics.
    """
    found: dict[str, set[str]] = {topic: set() for topic in DISCOVERY_TOPICS}
    field_pattern = re.compile(r"^\s{2}(\w+)\s*[(:]")
    for line in schema_text.splitlines():
        match = field_pattern.match(line)
        if not match:
            continue
        name = match.group(1)
        lowered = name.lower()
        for topic, keywords in DISCOVERY_TOPICS.items():
            if any(keyword in lowered for keyword in keywords):
                found[topic].add(name)
    return {topic: sorted(names) for topic, names in found.items()}


def signature_hints(schema_text: str, query_text: str) -> list[str]:
    """Real schema definition lines for the fields a failing query uses.

    A query usually fails for a boring reason - an argument renamed, an enum
    type called something else - and the fix is a one-line edit. Printing the
    actual definition from the schema turns that into a 30-second job.
    """
    names = {
        match.group(1)
        for match in re.finditer(r"^\s*(\w+)\s*[({]", query_text, re.MULTILINE)
        if match.group(1) not in {"query", "mutation", "fragment", "on"}
    }
    hints: list[str] = []
    for line in schema_text.splitlines():
        stripped = line.strip()
        for name in names:
            if stripped.startswith(f"{name}(") or stripped.startswith(f"{name}:"):
                hints.append(stripped[:160])
                break
    # Keep it readable: the first definition per field name is the useful one.
    seen: set[str] = set()
    unique: list[str] = []
    for hint in hints:
        head = hint.split("(")[0].split(":")[0]
        if head in seen:
            continue
        seen.add(head)
        unique.append(hint)
    return unique[:12]


def enum_values(schema_text: str, enum_name: str) -> list[str]:
    """Values of one enum, so ingest can send the spelling the schema expects."""
    match = re.search(rf"^enum\s+{enum_name}\s*{{(.*?)^}}", schema_text, re.MULTILINE | re.DOTALL)
    if not match:
        return []
    return [
        line.strip()
        for line in match.group(1).splitlines()
        if line.strip() and not line.strip().startswith("#") and not line.strip().startswith('"')
    ]


def run_doctor(*, refresh: bool = False) -> dict:
    if refresh or not SCHEMA_FILE.exists():
        print(f"Downloading Sorare's schema from {SCHEMA_URL} ...")
        size = download_schema()
        print(f"Saved {size:,} characters to {SCHEMA_FILE}\n")

    schema_text = SCHEMA_FILE.read_text(encoding="utf-8")
    schema = build_schema(schema_text, assume_valid_sdl=True)

    reports = [
        check_query(schema, path.stem, path.read_text(encoding="utf-8"))
        for path in sorted(QUERY_DIR.glob("*.graphql"))
    ]

    hints = {
        report.name: signature_hints(
            schema_text, (QUERY_DIR / f"{report.name}.graphql").read_text(encoding="utf-8")
        )
        for report in reports
        if not report.ok
    }

    capabilities = {
        "schema_bytes": len(schema_text),
        "hints": hints,
        "queries": {
            report.name: {
                "ok": report.ok,
                "disabled": report.disabled,
                "errors": report.errors,
            }
            for report in reports
        },
        "disabled_fields": sorted({key for report in reports for key in report.disabled}),
        "discovery": discover(schema_text),
        "enums": {name: enum_values(schema_text, name) for name in ("Rarity", "TokenOfferType")},
    }
    CAPABILITIES_FILE.write_text(json.dumps(capabilities, indent=2), encoding="utf-8")
    return capabilities


def load_capabilities() -> dict:
    if not CAPABILITIES_FILE.exists():
        return {"queries": {}, "disabled_fields": [], "discovery": {}}
    try:
        return json.loads(CAPABILITIES_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"queries": {}, "disabled_fields": [], "discovery": {}}


def format_report(capabilities: dict) -> str:
    lines = ["", "Schema doctor report", "=" * 60]
    queries = capabilities.get("queries", {})
    for name, result in sorted(queries.items()):
        if result["ok"] and not result["disabled"]:
            lines.append(f"  OK       {name}")
        elif result["ok"]:
            lines.append(f"  PARTIAL  {name}  (dropped: {', '.join(result['disabled'])})")
        else:
            lines.append(f"  FAILED   {name}")
            for message in result["errors"][:4]:
                lines.append(f"             {message}")
            for hint in (capabilities.get("hints") or {}).get(name, [])[:6]:
                lines.append(f"             schema says: {hint}")

    lines += ["", "Field discovery (real names in your schema, for the undocumented areas)", "-" * 60]
    for topic, names in (capabilities.get("discovery") or {}).items():
        shown = ", ".join(names[:18]) if names else "nothing found"
        lines.append(f"  {topic:<12} {shown}")
        if len(names) > 18:
            lines.append(f"  {'':<12} ... and {len(names) - 18} more")
    enums = capabilities.get("enums") or {}
    if any(enums.values()):
        lines += ["", "Enum spellings taken from your schema", "-" * 60]
        for name, values in enums.items():
            if values:
                lines.append(f"  {name:<16} {', '.join(values[:12])}")
    lines.append("")
    return "\n".join(lines)
