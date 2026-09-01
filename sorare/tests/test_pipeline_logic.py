"""Unit tests for the parts where a silent mistake would cost real money.

Run them with:  .venv\\Scripts\\python.exe -m pytest tests
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sorare_portfolio import db  # noqa: E402
from sorare_portfolio.ingest import common  # noqa: E402
from sorare_portfolio.schema_doctor import optional_keys, strip_optional  # noqa: E402
from sorare_portfolio.settings import INCLUSION_SETS, inclusion_set_name  # noqa: E402
from sorare_portfolio.transform import investments, liquidity, pnl, valuation  # noqa: E402


def test_amounts_are_cents():
    assert common.money_eur({"eur": 12500}) == 125.00
    assert common.money_eur({"eur": 0}) == 0.0
    assert common.money_eur(None) is None


def test_season_class_follows_the_football_season():
    august = datetime(2026, 8, 15, tzinfo=timezone.utc)
    may = datetime(2026, 5, 15, tzinfo=timezone.utc)
    assert common.season_class({"seasonYear": 2026}, august) == "IN_SEASON"
    assert common.season_class({"seasonYear": 2026}, may) == "CLASSIC"
    assert common.season_class({"seasonYear": 2025}, may) == "IN_SEASON"
    # An explicit flag from the schema always wins.
    assert common.season_class({"seasonYear": 1999, "inSeasonEligible": True}, may) == "IN_SEASON"


def test_transaction_types_map_to_the_five_categories():
    assert common.normalise_type("SINGLE_SALE_OFFER") == "MANAGER_SALE"
    assert common.normalise_type("single_buy_offer") == "ACCEPTED_BUY_OFFER"
    assert common.normalise_type("TokenPrimaryOffer".upper()) == "INSTANT_BUY"
    assert common.normalise_type("DIRECT_OFFER") == "DIRECT_OFFER"
    # An unknown type is kept, not silently dropped into another bucket.
    assert common.normalise_type("SOMETHING_NEW") == "SOMETHING_NEW"


def test_optional_fields_are_stripped_by_capability_key():
    query = "query Q {\n  a\n  b { c }   # @opt Type.b\n}"
    assert optional_keys(query) == {"Type.b": "b"}
    assert "b {" not in strip_optional(query, ["Type.b"])
    assert "b {" in strip_optional(query, [])


def _tape(now: datetime) -> pd.DataFrame:
    rows = []
    for day, price, sale_type in [
        (1, 100.0, "MANAGER_SALE"),
        (2, 110.0, "MANAGER_SALE"),
        (3, 90.0, "ACCEPTED_BUY_OFFER"),
        (4, 500.0, "AUCTION"),        # outlier that must not move the median
        (40, 60.0, "MANAGER_SALE"),   # outside the 30-day window
    ]:
        rows.append(
            {
                "player_slug": "p", "rarity": "limited", "season_class": "IN_SEASON",
                "occurred_at": now - timedelta(days=day), "eur": price, "sale_type": sale_type,
                "card_slug": None, "source": "test",
            }
        )
    return pd.DataFrame(rows)


def test_fair_value_uses_the_median_of_included_types_only():
    now = datetime.now(timezone.utc)
    grid = valuation.fair_value_grid(_tape(now))
    secondary = grid[(grid["window_days"] == 30) & (grid["inclusion_set"] == "SECONDARY")].iloc[0]
    assert secondary["sales"] == 3
    assert secondary["median_eur"] == 100.0          # the 500 auction is excluded
    market = grid[(grid["window_days"] == 30) & (grid["inclusion_set"] == "MARKET")].iloc[0]
    assert market["sales"] == 4
    assert market["median_eur"] == 105.0             # median resists the outlier


def test_thin_tape_falls_back_to_the_floor_and_says_so():
    now = datetime.now(timezone.utc)
    settings = {
        "valuation": {
            "quick_sale_discount": 0.05, "fair_value_window_days": 30,
            "inclusion_set_name": "SECONDARY", "fair_value_statistic": "median",
            "min_sales_for_fair_value": 3, "floor_fallback_haircut": 0.95,
        }
    }
    positions = pd.DataFrame(
        [{"player_slug": "q", "rarity": "rare", "season_class": "CLASSIC",
          "cards_owned": 2, "total_cost_eur": 100.0, "avg_cost_eur": 50.0}]
    )
    floors = pd.DataFrame(
        [{"player_slug": "q", "rarity": "rare", "season_class": "CLASSIC",
          "floor_eur": 80.0, "listing_count": 2}]
    )
    resolved = valuation.resolve_fair_value(positions, valuation.fair_value_grid(_tape(now)), floors, settings)
    row = resolved.iloc[0]
    assert row["confidence"] == "LOW"
    assert row["value_basis"] == "floor-derived"
    assert row["value_per_card_eur"] == pytest.approx(76.0)      # 80 * 0.95
    assert row["quick_sale_price_eur"] == pytest.approx(76.0)    # floor 80 less 5%


def test_realised_pl_matches_the_same_card_and_ignores_swaps():
    now = pd.Timestamp.now(tz="UTC")
    transactions = pd.DataFrame(
        [
            {"txn_key": "1", "occurred_at": now - pd.Timedelta(days=30), "card_slug": "card-a",
             "player_slug": "p", "rarity": "limited", "season_year": 2025, "season_class": "CLASSIC",
             "txn_type": "AUCTION", "side": "BUY", "quantity": 1, "eur": 40.0,
             "counterparty": None, "is_cash_trade": 1},
            {"txn_key": "2", "occurred_at": now - pd.Timedelta(days=2), "card_slug": "card-a",
             "player_slug": "p", "rarity": "limited", "season_year": 2025, "season_class": "CLASSIC",
             "txn_type": "MANAGER_SALE", "side": "SELL", "quantity": 1, "eur": 65.0,
             "counterparty": "someone", "is_cash_trade": 1},
            {"txn_key": "3", "occurred_at": now - pd.Timedelta(days=1), "card_slug": "card-b",
             "player_slug": "p", "rarity": "limited", "season_year": 2025, "season_class": "CLASSIC",
             "txn_type": "DIRECT_OFFER", "side": "SELL", "quantity": 1, "eur": 0.0,
             "counterparty": "someone", "is_cash_trade": 0},
        ]
    )
    realised = pnl.realised_trades(transactions)
    assert len(realised) == 1                       # the card-for-card swap is not a realisation
    assert realised.iloc[0]["realised_pl_eur"] == 25.0
    assert realised.iloc[0]["card_slug"] == "card-a"


def test_liquidity_bands_and_market_impact_flag():
    now = datetime.now(timezone.utc)
    tape = pd.DataFrame(
        [
            {"player_slug": "p", "rarity": "limited", "season_class": "IN_SEASON",
             "occurred_at": now - timedelta(days=day), "eur": 10.0, "sale_type": "MANAGER_SALE"}
            for day in range(0, 60, 2)
        ]
    )
    positions = pd.DataFrame(
        [{"player_slug": "p", "rarity": "limited", "season_class": "IN_SEASON",
          "player_name": "P", "cards_owned": 9, "quick_sale_value_eur": 90.0}]
    )
    settings = {"liquidity": {"liquidity_window_days": 30, "high_liquidity_min_daily_sales": 1.0,
                              "medium_liquidity_min_daily_sales": 0.25,
                              "market_impact_warning_share": 0.20}}
    row = liquidity.liquidity_table(positions, tape, settings).iloc[0]
    assert row["sales_30d"] == 15
    assert row["avg_daily_sales"] == pytest.approx(0.5)
    assert row["liquidity_band"] == "MEDIUM"
    assert row["liquidation_days"] == pytest.approx(18.0)
    assert row["liquidation_days_conservative"] == pytest.approx(36.0)
    assert row["market_impact_flag"] == "WATCH"     # 9 cards against 15 recent sales


def test_expected_price_is_probability_weighted(tmp_path):
    with db.session(tmp_path / "test.db") as connection:
        db.upsert_many(
            connection, "investment",
            [{"investment_key": "k", "player_slug": "p", "player_name": "P", "rarity": "limited",
              "quantity": 2, "avg_entry": 10.0, "target_price": 30.0, "downside_price": 5.0,
              "thesis": "t", "catalyst": "c", "catalyst_date": None, "status": "OPEN",
              "bear_prob": 0.25, "bear_price": 5.0, "base_prob": 0.5, "base_price": 15.0,
              "bull_prob": 0.25, "bull_price": 30.0, "extreme_prob": 0.0, "extreme_price": 0.0,
              "notes": ""}],
            key="investment_key",
        )
        row = investments.investment_table(connection, pd.DataFrame()).iloc[0]
    assert row["expected_price_eur"] == pytest.approx(16.25)   # .25*5 + .5*15 + .25*30
    assert row["probability_warning"] == ""
    assert row["expected_upside_pct"] == pytest.approx(62.5)   # against the 10.00 entry
    assert row["expected_profit_eur"] == pytest.approx(12.5)


def test_inclusion_set_round_trip():
    assert inclusion_set_name(list(INCLUSION_SETS["MARKET"])) == "MARKET"
    assert inclusion_set_name(["MANAGER_SALE", "ACCEPTED_BUY_OFFER"]) == "SECONDARY"
    assert inclusion_set_name(["NONSENSE"]) == "SECONDARY"


def test_upserts_never_double_count(tmp_path):
    row = {"obs_key": "k", "player_slug": "p", "rarity": "limited", "season_year": 2025,
           "season_class": "CLASSIC", "occurred_at": "2026-01-01T00:00:00+00:00", "eur": 10.0,
           "wei": None, "sale_type": "MANAGER_SALE", "card_slug": None, "source": "test",
           "first_seen": db.utcnow()}
    with db.session(tmp_path / "test.db") as connection:
        assert db.upsert_many(connection, "price_obs", [row], key="obs_key") == 1
        assert db.upsert_many(connection, "price_obs", [row], key="obs_key") == 0
        assert connection.execute("SELECT COUNT(*) FROM price_obs").fetchone()[0] == 1
