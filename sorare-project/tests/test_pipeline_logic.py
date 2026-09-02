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
    """MonetaryAmount reports cents: eurCents 12500 is EUR 125.00."""
    assert common.money_eur({"eurCents": 12500, "wei": "1"}) == 125.00
    assert common.money_eur({"eurCents": 0}) == 0.0
    assert common.money_eur({"wei": "1"}) is None      # crypto-only sale, no fiat figure
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
    """Against Sorare's real OwnerTransfer and OfferType enums."""
    assert common.normalise_type("SINGLE_SALE_OFFER") == "MANAGER_SALE"
    assert common.normalise_type("single_buy_offer") == "ACCEPTED_BUY_OFFER"
    assert common.normalise_type("ENGLISH_AUCTION") == "AUCTION"
    assert common.normalise_type("BUNDLED_ENGLISH_AUCTION") == "AUCTION"
    assert common.normalise_type("INSTANT_BUY") == "INSTANT_BUY"
    assert common.normalise_type("DIRECT_OFFER") == "DIRECT_OFFER"
    # Arrivals that are not purchases keep their own identity: an Essence craft
    # must not be filed as a reward, nor either of them as a trade.
    assert common.normalise_type("SHARDS") == "SHARD_CRAFT"
    assert common.normalise_type("REWARD") == "REWARD"
    assert "SHARD_CRAFT" in common.NON_PURCHASE_TYPES and "REWARD" in common.NON_PURCHASE_TYPES
    assert "MANAGER_SALE" not in common.NON_PURCHASE_TYPES
    # An unknown type is kept, not silently dropped into another bucket.
    assert common.normalise_type("SOMETHING_NEW") == "SOMETHING_NEW"


def test_sale_venue_comes_from_the_deal_union():
    """TokenDeal's __typename separates auctions and instant buys from offers."""
    from sorare_portfolio.ingest.prices import sale_type_of

    assert sale_type_of({"__typename": "TokenAuction", "id": "1"}) == "AUCTION"
    assert sale_type_of({"__typename": "TokenPrimaryOffer", "id": "2"}) == "INSTANT_BUY"
    assert sale_type_of({"__typename": "TokenOffer", "type": "SINGLE_SALE_OFFER"}) == "MANAGER_SALE"
    assert sale_type_of({"__typename": "TokenOffer", "type": "SINGLE_BUY_OFFER"}) == "ACCEPTED_BUY_OFFER"
    assert sale_type_of({"__typename": "TokenOffer", "type": "DIRECT_OFFER"}) == "DIRECT_OFFER"
    assert sale_type_of(None) == "UNKNOWN"


def test_form_is_derived_from_the_match_list():
    """L5/L10/L40 and the starter share all come from so5Scores."""
    from sorare_portfolio.ingest.scores import _score_rows

    player = {
        "slug": "p",
        "so5Scores": [
            {"score": 60.0, "game": {"date": "2026-05-01T18:00:00Z"},
             "playerGameStats": {"minsPlayed": 90, "gameStarted": 1, "onGameSheet": True}},
            {"score": 20.0, "game": {"date": "2026-05-08T18:00:00Z"},
             "playerGameStats": {"minsPlayed": 12, "gameStarted": 0, "onGameSheet": True}},
            None,
        ],
    }
    rows = _score_rows(player)
    assert len(rows) == 2
    assert [row["started"] for row in rows] == [1, 0]
    assert rows[0]["minutes"] == 90
    assert rows[0]["played_at"] == "2026-05-01T18:00:00+00:00"
    assert len({row["score_key"] for row in rows}) == 2


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


def test_reward_cards_are_detected_but_never_valued_at_a_guess(tmp_path):
    """Zero-cost cards in the gallery are rewards - crafts and repeats are not."""
    from sorare_portfolio.transform.rewards import derive_reward_cards

    cards = [
        {"slug": "free-card", "player_slug": None, "rarity": "limited", "acquired_at": "2026-01-02T00:00:00+00:00",
         "acquisition_eur": 0.0, "acquisition_type": "REWARD_OR_CRAFT", "owned": 1},
        {"slug": "bought-card", "player_slug": None, "rarity": "rare", "acquired_at": "2026-01-03T00:00:00+00:00",
         "acquisition_eur": 42.0, "acquisition_type": "AUCTION", "owned": 1},
        {"slug": "crafted-card", "player_slug": None, "rarity": "limited", "acquired_at": "2026-01-04T00:00:00+00:00",
         "acquisition_eur": 0.0, "acquisition_type": "REWARD_OR_CRAFT", "owned": 1},
    ]
    with db.session(tmp_path / "test.db") as connection:
        db.upsert_many(connection, "card", cards, key="slug")
        db.upsert_many(
            connection, "essence_event",
            [{"event_key": "e1", "occurred_on": "2026-01-04", "direction": "SPEND", "scarcity": "LIMITED",
              "amount": 1000.0, "card_slug": "crafted-card"}],
            key="event_key",
        )

        assert derive_reward_cards(connection) == 1
        assert derive_reward_cards(connection) == 0      # re-running never duplicates

        row = connection.execute("SELECT * FROM reward").fetchone()
        assert row["card_slug"] == "free-card"           # the craft stays with Essence
        assert row["cash_eur"] == 0.0
        assert row["card_value_at_receipt"] is None      # never a guessed value


def test_schema_download_writes_the_file_and_rejects_a_non_schema(tmp_path, monkeypatch):
    """Saving the schema from a browser is easy to get wrong, so we fetch it.

    The guard matters: a captive portal or an error page returns 200 with HTML,
    and writing that to schema.graphql would break every later run in a way
    that looks like Sorare changed their API.
    """
    from sorare_portfolio import schema_doctor

    class Response:
        def __init__(self, text):
            self.text = text

        def raise_for_status(self):
            return None

    schema_text = "type Query { currentUser: CurrentUser }\ntype CurrentUser { slug: String }\n"
    monkeypatch.setattr(schema_doctor.requests, "get", lambda *a, **k: Response(schema_text))
    target = tmp_path / "config" / "schema.graphql"
    assert schema_doctor.download_schema(target) == len(schema_text)
    assert "type Query" in target.read_text()

    monkeypatch.setattr(schema_doctor.requests, "get", lambda *a, **k: Response("<html>nope</html>"))
    with pytest.raises(schema_doctor.SchemaDownloadError, match="not a GraphQL schema"):
        schema_doctor.download_schema(target)
    assert "type Query" in target.read_text()      # the good copy is not clobbered


class FakeClient:
    """Stands in for the API, returning payloads shaped like the real schema.

    The point is the shape: response paths, cents, and the enum spellings taken
    from Sorare's published schema. It catches a mis-keyed response path, which
    is the failure that otherwise only shows up against the live API.
    """

    def __init__(self, pages=(), execute_result=None):
        self.pages = list(pages)
        self.execute_result = execute_result or {}
        self.calls = []

    def paginate(self, query, variables, *, path, operation_name=None, snapshot=None, page_limit=200):
        self.calls.append(("paginate", path, variables))
        yield from self.pages

    def execute(self, query, variables=None, *, operation_name=None, snapshot=None, tolerate_errors=False):
        self.calls.append(("execute", operation_name, variables))
        return self.execute_result


def _card_node(slug, transfer_type, cents, *, in_season=True):
    return {
        "slug": slug, "assetId": "0x1", "rarityTyped": "limited", "seasonYear": 2025,
        "serialNumber": 12, "anyPositions": ["Goalkeeper"], "xp": 100, "grade": 1,
        "inSeasonEligible": in_season,
        "anyPlayer": {
            "slug": "keeper", "displayName": "A Keeper", "age": 29,
            "activeClub": {"slug": "club", "name": "A Club",
                           "domesticLeague": {"displayName": "Premier League"}},
        },
        "anyTeam": {"name": "A Club"},
        "tokenOwner": {"from": "2026-01-05T10:00:00Z", "transferType": transfer_type,
                       "amounts": {"wei": "1", "eurCents": cents}},
    }


def test_gallery_ingest_reads_cost_and_arrival_type_from_the_schema(tmp_path):
    from sorare_portfolio.ingest.gallery import ingest_gallery

    client = FakeClient(pages=[
        _card_node("bought-card", "ENGLISH_AUCTION", 4550),
        _card_node("reward-card", "REWARD", 0, in_season=False),
        _card_node("crafted-card", "SHARDS", 0),
    ])
    with db.session(tmp_path / "test.db") as connection:
        result = ingest_gallery(client, connection)
        assert result["cards_seen"] == 3

        cards = {row["slug"]: row for row in connection.execute("SELECT * FROM card")}
        assert cards["bought-card"]["acquisition_eur"] == 45.50      # cents -> euros
        assert cards["bought-card"]["acquisition_type"] == "AUCTION"
        assert cards["bought-card"]["season_class"] == "IN_SEASON"
        assert cards["reward-card"]["acquisition_type"] == "REWARD"
        assert cards["reward-card"]["season_class"] == "CLASSIC"
        assert cards["crafted-card"]["acquisition_type"] == "SHARD_CRAFT"

        player = connection.execute("SELECT * FROM player").fetchone()
        assert player["club_name"] == "A Club" and player["league"] == "Premier League"

        # Only the purchase is a cash buy: a reward and a craft cost nothing and
        # must never enter cost basis as if they had.
        txns = {row["card_slug"]: row for row in connection.execute("SELECT * FROM txn")}
        assert txns["bought-card"]["side"] == "BUY" and txns["bought-card"]["is_cash_trade"] == 1
        assert txns["reward-card"]["side"] == "RECEIVE" and txns["reward-card"]["is_cash_trade"] == 0
        assert txns["crafted-card"]["side"] == "RECEIVE"


def test_price_tape_reads_the_tokens_root_and_asks_only_for_new_sales(tmp_path):
    from sorare_portfolio.ingest import prices

    payload = {"tokens": {"tokenPrices": [
        {"date": "2026-05-02T12:00:00Z", "amounts": {"wei": "1", "eurCents": 1999},
         "deal": {"__typename": "TokenOffer", "type": "SINGLE_SALE_OFFER"},
         "card": {"slug": "c1", "seasonYear": 2025, "serialNumber": 3, "inSeasonEligible": True}},
        {"date": "2026-05-03T12:00:00Z", "amounts": {"wei": "1", "eurCents": 2500},
         "deal": {"__typename": "TokenAuction"},
         "card": {"slug": "c2", "seasonYear": 2023, "serialNumber": 4, "inSeasonEligible": False}},
    ]}}
    client = FakeClient(execute_result=payload)
    with db.session(tmp_path / "test.db") as connection:
        db.upsert_many(connection, "player", [{"slug": "keeper", "display_name": "A Keeper"}],
                       key="slug")
        db.upsert_many(connection, "card", [{"slug": "c1", "player_slug": "keeper",
                                             "rarity": "limited", "owned": 1}], key="slug")
        result = prices.ingest_prices(client, connection)
        assert result["tape_new"] == 2

        rows = {row["eur"]: row for row in connection.execute("SELECT * FROM price_obs")}
        assert rows[19.99]["sale_type"] == "MANAGER_SALE"
        assert rows[19.99]["season_class"] == "IN_SEASON"
        assert rows[25.0]["sale_type"] == "AUCTION"
        assert rows[25.0]["season_class"] == "CLASSIC"

        # The next run asks only for sales newer than the newest one held.
        assert prices._since(connection, "keeper", "limited") == "2026-05-03T12:00:00+00:00"


def test_trade_values_each_card_on_its_trade_date_and_today():
    """A swap realises no cash, so only market values show whether it was good."""
    from sorare_portfolio.transform.trades import trade_table

    now = pd.Timestamp.now(tz="UTC")
    traded_on = now - pd.Timedelta(days=20)

    def print_row(player, days_ago, price):
        return {"player_slug": player, "rarity": "limited", "season_class": "IN_SEASON",
                "occurred_at": now - pd.Timedelta(days=days_ago), "eur": price,
                "sale_type": "MANAGER_SALE"}

    tape = pd.DataFrame([
        print_row("given", 21, 100.0), print_row("given", 19, 110.0),   # ~105 at the trade
        print_row("given", 1, 60.0), print_row("given", 0, 62.0),       # ~61 today
        print_row("got", 22, 80.0), print_row("got", 18, 84.0),         # ~82 at the trade
        print_row("got", 1, 130.0), print_row("got", 0, 134.0),         # ~132 today
    ])

    def leg(player, side, card, txn_type="DIRECT_OFFER", eur=0.0, cash=0):
        return {"txn_key": card, "source_id": "offer-1", "occurred_at": traded_on,
                "card_slug": card, "player_slug": player, "rarity": "limited",
                "season_year": 2025, "season_class": "IN_SEASON", "txn_type": txn_type,
                "side": side, "quantity": 1, "eur": eur, "counterparty": "them",
                "is_cash_trade": cash}

    transactions = pd.DataFrame([
        leg("given", "SELL", "card-out"),
        leg("got", "BUY", "card-in"),
        # 20 EUR paid on top of the cards.
        {**leg(None, "BUY", None, "DIRECT_OFFER_CASH", 20.0, 1), "card_slug": None,
         "player_slug": None, "txn_key": "cash"},
    ])

    table = trade_table(transactions, tape, pd.DataFrame())
    assert set(table["direction"]) == {"GAVE", "GOT"}

    gave = table[table["direction"] == "GAVE"].iloc[0]
    got = table[table["direction"] == "GOT"].iloc[0]
    assert gave["value_at_trade_eur"] == pytest.approx(105.0)
    assert gave["value_today_eur"] == pytest.approx(61.0)
    assert gave["change_since_trade_eur"] == pytest.approx(-44.0)
    assert got["value_at_trade_eur"] == pytest.approx(82.0)
    assert got["value_today_eur"] == pytest.approx(132.0)

    # On the day: got 82, gave 105, paid 20 cash -> 43 down.
    assert got["trade_net_at_trade_eur"] == pytest.approx(-43.0)
    # Since then the card you took ran and the one you gave away fell: 51 up.
    assert got["trade_net_today_eur"] == pytest.approx(51.0)
    assert got["cash_paid_eur"] == pytest.approx(20.0)


def test_trade_cash_is_never_treated_as_a_card_price():
    """The sweetener in a swap must not become cost basis for the cards."""
    from sorare_portfolio.ingest.transactions import _parse_ended_offer

    node = {
        "id": "offer-9", "type": "DIRECT_OFFER", "status": "accepted",
        "acceptedAt": "2026-04-01T10:00:00Z", "endDate": "2026-04-01T10:00:00Z",
        "senderSide": {"amounts": {"wei": "1", "eurCents": 5000},
                       "anyCards": [{"slug": "mine", "rarityTyped": "limited", "seasonYear": 2025,
                                     "anyPlayer": {"slug": "a"}}]},
        "receiverSide": {"amounts": {"wei": "0", "eurCents": 0},
                         "anyCards": [{"slug": "theirs", "rarityTyped": "limited", "seasonYear": 2025,
                                       "anyPlayer": {"slug": "b"}}]},
        "userBuyer": {"slug": "them", "nickname": "Them"},
    }
    rows = {row["card_slug"]: row for row in _parse_ended_offer(node, sent=True)}
    assert rows["mine"]["eur"] == 0.0 and rows["mine"]["is_cash_trade"] == 0
    assert rows["theirs"]["eur"] == 0.0 and rows["theirs"]["is_cash_trade"] == 0
    cash = rows[None]
    assert cash["txn_type"] == "DIRECT_OFFER_CASH"
    assert cash["eur"] == 50.0 and cash["side"] == "BUY"     # you added the cash


def test_secret_description_spots_paste_mistakes_without_leaking():
    """The sign-in check must describe a password, never reveal it."""
    from sorare_portfolio.login_check import _describe

    secret = "correct-horse-battery"
    described = _describe(secret)
    assert secret not in described
    assert described == "21 characters"
    assert "looks wrapped in quotes" in _describe('"quoted"')
    assert "has leading or trailing spaces" in _describe("trailing ")
    assert "still looks like a placeholder" in _describe("<your-password>")
