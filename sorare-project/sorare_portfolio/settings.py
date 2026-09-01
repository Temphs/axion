"""Typed access to config/settings.yml with sane fallbacks."""

from __future__ import annotations

import copy
from typing import Any

import yaml

from .paths import SETTINGS_FILE

DEFAULTS: dict[str, Any] = {
    "currency": "EUR",
    "account": {"cash_balance_eur": 0.0},
    "valuation": {
        "quick_sale_discount": 0.05,
        "fair_value_window_days": 30,
        "fair_value_included_types": ["MANAGER_SALE", "ACCEPTED_BUY_OFFER"],
        "fair_value_statistic": "median",
        "min_sales_for_fair_value": 3,
        "floor_fallback_haircut": 0.95,
    },
    "liquidity": {
        "high_liquidity_min_daily_sales": 1.0,
        "medium_liquidity_min_daily_sales": 0.25,
        "market_impact_warning_share": 0.20,
        "liquidity_window_days": 30,
    },
    "essence": {
        "assumed_eur_per_1000_limited": 0.0,
        "assumed_eur_per_1000_rare": 0.0,
    },
    "ingest": {
        "track_players": "owned",
        "extra_player_slugs": [],
        "max_api_calls_per_run": 900,
        "raw_snapshot_retention_days": 30,
    },
}

FAIR_VALUE_WINDOWS = (1, 7, 30, 90)

# The inclusion sets the pipeline pre-computes for every position, so the Player
# Terminal can switch between them with a lookup instead of a recalculation.
INCLUSION_SETS: dict[str, tuple[str, ...]] = {
    "ALL": ("AUCTION", "INSTANT_BUY", "MANAGER_SALE", "ACCEPTED_BUY_OFFER", "DIRECT_OFFER"),
    "SECONDARY": ("MANAGER_SALE", "ACCEPTED_BUY_OFFER"),
    "NO_AUCTION": ("INSTANT_BUY", "MANAGER_SALE", "ACCEPTED_BUY_OFFER"),
    "MARKET": ("AUCTION", "INSTANT_BUY", "MANAGER_SALE", "ACCEPTED_BUY_OFFER"),
}


def _merge(base: dict, override: dict) -> dict:
    out = copy.deepcopy(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _merge(out[key], value)
        else:
            out[key] = value
    return out


def load_settings() -> dict[str, Any]:
    if SETTINGS_FILE.exists():
        with SETTINGS_FILE.open(encoding="utf-8") as handle:
            user = yaml.safe_load(handle) or {}
    else:
        user = {}
    return _merge(DEFAULTS, user)


def inclusion_set_name(included_types: list[str]) -> str:
    """Map a list of sale types onto the nearest pre-computed inclusion set."""
    wanted = frozenset(included_types)
    for name, types in INCLUSION_SETS.items():
        if frozenset(types) == wanted:
            return name
    return "SECONDARY"
