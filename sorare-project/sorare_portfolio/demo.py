"""Generate a realistic sample portfolio.

Two uses: it lets you see the whole dashboard working before you connect your
account, and it is what the tests run against. Demo data goes into a separate
database file so it can never mix with your real one.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from . import db
from .ingest.common import current_season_year

PLAYERS = [
    ("erling-haaland", "Erling Haaland", "Manchester City", "Premier League", "Forward", 25),
    ("jude-bellingham", "Jude Bellingham", "Real Madrid", "LaLiga", "Midfielder", 22),
    ("mike-maignan", "Mike Maignan", "AC Milan", "Serie A", "Goalkeeper", 30),
    ("alejandro-grimaldo", "Alejandro Grimaldo", "Bayer Leverkusen", "Bundesliga", "Defender", 30),
    ("bradley-barcola", "Bradley Barcola", "Paris Saint-Germain", "Ligue 1", "Forward", 23),
    ("cole-palmer", "Cole Palmer", "Chelsea", "Premier League", "Midfielder", 24),
]
RARITIES = ["limited", "rare"]
SALE_TYPES = ["MANAGER_SALE", "ACCEPTED_BUY_OFFER", "AUCTION", "INSTANT_BUY", "DIRECT_OFFER"]


def seed(connection, *, seed_value: int = 7) -> None:
    random.seed(seed_value)
    now = datetime.now(timezone.utc)
    season = current_season_year(now)
    stamp = db.utcnow()

    # Children before parents: card has a foreign key onto player.
    for table in (
        "card", "txn", "price_obs", "floor_snap", "player_score", "reward",
        "essence_event", "cash_flow", "investment", "portfolio_snapshot", "player",
    ):
        connection.execute(f"DELETE FROM {table}")

    db.upsert_many(
        connection,
        "player",
        [
            {
                "slug": slug, "display_name": name, "club_slug": club.lower().replace(" ", "-"),
                "club_name": club, "league": league, "position": position, "age": age,
                "updated_at": stamp,
            }
            for slug, name, club, league, position, age in PLAYERS
        ],
        key="slug",
        update=["display_name", "club_name", "league", "position", "age", "updated_at"],
    )

    cards, transactions, tape, floors, scores = [], [], [], [], []

    for slug, name, club, league, position, age in PLAYERS:
        for rarity in RARITIES:
            base = {"limited": 18.0, "rare": 95.0}[rarity] * random.uniform(0.5, 2.2)
            for season_class, season_year in (("IN_SEASON", season), ("CLASSIC", season - 2)):
                copies = random.choice([0, 1, 1, 2, 3, 5])
                if copies == 0:
                    continue
                for copy_index in range(copies):
                    acquired = now - timedelta(days=random.randint(20, 400))
                    paid = round(base * random.uniform(0.6, 1.25), 2)
                    card_slug = f"{slug}-{season_year}-{rarity}-{copy_index + 1}"
                    cards.append(
                        {
                            "slug": card_slug, "asset_id": f"0x{random.getrandbits(48):012x}",
                            "player_slug": slug, "rarity": rarity, "season_year": season_year,
                            "season_class": season_class, "serial_number": random.randint(1, 100),
                            "positions": position, "xp": random.randint(0, 4000), "grade": None,
                            "acquired_at": acquired.isoformat(timespec="seconds"),
                            "acquisition_eur": paid,
                            "acquisition_type": random.choice(["AUCTION", "MANAGER_SALE", "INSTANT_BUY"]),
                            "owned": 1, "first_seen": stamp, "last_seen": stamp,
                        }
                    )
                    transactions.append(
                        {
                            "txn_key": db.natural_key("demo-buy", card_slug),
                            "source_id": card_slug,
                            "occurred_at": acquired.isoformat(timespec="seconds"),
                            "card_slug": card_slug, "player_slug": slug, "rarity": rarity,
                            "season_year": season_year, "season_class": season_class,
                            "txn_type": cards[-1]["acquisition_type"], "side": "BUY", "quantity": 1,
                            "eur": paid, "wei": None, "counterparty": None, "is_cash_trade": 1,
                            "ingested_at": stamp,
                        }
                    )

                # A market tape that drifts, so the charts show something real.
                drift = random.uniform(-0.25, 0.45)
                for day in range(90):
                    if random.random() > {"limited": 0.55, "rare": 0.3}[rarity]:
                        continue
                    when = now - timedelta(days=day, hours=random.randint(0, 23))
                    price = round(base * (1 + drift * (90 - day) / 90) * random.uniform(0.88, 1.14), 2)
                    tape.append(
                        {
                            "obs_key": db.natural_key("demo", slug, rarity, season_class, day, price),
                            "player_slug": slug, "rarity": rarity, "season_year": season_year,
                            "season_class": season_class,
                            "occurred_at": when.isoformat(timespec="seconds"), "eur": price,
                            "wei": None,
                            "sale_type": random.choices(SALE_TYPES, weights=[45, 20, 20, 10, 5])[0],
                            "card_slug": None, "source": "demo", "first_seen": stamp,
                        }
                    )
                floor_price = round(base * random.uniform(0.95, 1.3), 2)
                floors.append(
                    {
                        "snap_key": db.natural_key("demo-floor", slug, rarity, season_class),
                        "player_slug": slug, "rarity": rarity, "season_class": season_class,
                        "observed_at": stamp, "floor_eur": floor_price,
                        "listing_count": random.randint(1, 25),
                    }
                )

        for match in range(12):
            played = now - timedelta(days=7 * match + random.randint(0, 3))
            started = random.random() > 0.25
            scores.append(
                {
                    "score_key": db.natural_key("demo-score", slug, match),
                    "player_slug": slug, "played_at": played.isoformat(timespec="seconds"),
                    "competition": league,
                    "score": round(random.uniform(15, 85) if started else random.uniform(0, 30), 1),
                    "minutes": random.randint(70, 90) if started else random.randint(0, 25),
                    "started": int(started), "opponent": "TBD",
                }
            )

    # A few completed sales of your own, so realised P/L is not empty.
    for card in random.sample(cards, 4):
        sold_at = now - timedelta(days=random.randint(1, 40))
        transactions.append(
            {
                "txn_key": db.natural_key("demo-sell", card["slug"]),
                "source_id": card["slug"], "occurred_at": sold_at.isoformat(timespec="seconds"),
                "card_slug": card["slug"], "player_slug": card["player_slug"],
                "rarity": card["rarity"], "season_year": card["season_year"],
                "season_class": card["season_class"], "txn_type": "MANAGER_SALE", "side": "SELL",
                "quantity": 1, "eur": round(card["acquisition_eur"] * random.uniform(0.75, 1.6), 2),
                "wei": None, "counterparty": "another-manager", "is_cash_trade": 1,
                "ingested_at": stamp,
            }
        )
        card["owned"] = 0

    # A card-for-card swap with cash on top, so the Trades sheet has something
    # to show: two cards out, one in, and 25 EUR received.
    swap_out = random.sample([c for c in cards if c["owned"] == 1], 2)
    swap_in = swap_out[0]
    swapped_at = (now - timedelta(days=21)).isoformat(timespec="seconds")
    for card in swap_out:
        card["owned"] = 0
        transactions.append(
            {
                "txn_key": db.natural_key("demo-swap-out", card["slug"]),
                "source_id": "demo-swap-1", "occurred_at": swapped_at,
                "card_slug": card["slug"], "player_slug": card["player_slug"],
                "rarity": card["rarity"], "season_year": card["season_year"],
                "season_class": card["season_class"], "txn_type": "DIRECT_OFFER",
                "side": "SELL", "quantity": 1, "eur": 0.0, "wei": None,
                "counterparty": "another-manager", "is_cash_trade": 0, "ingested_at": stamp,
            }
        )
    transactions.append(
        {
            "txn_key": db.natural_key("demo-swap-in", swap_in["slug"]),
            "source_id": "demo-swap-1", "occurred_at": swapped_at,
            "card_slug": swap_in["slug"] + "-received", "player_slug": swap_in["player_slug"],
            "rarity": swap_in["rarity"], "season_year": swap_in["season_year"],
            "season_class": swap_in["season_class"], "txn_type": "DIRECT_OFFER",
            "side": "BUY", "quantity": 1, "eur": 0.0, "wei": None,
            "counterparty": "another-manager", "is_cash_trade": 0, "ingested_at": stamp,
        }
    )
    transactions.append(
        {
            "txn_key": db.natural_key("demo-swap-cash"), "source_id": "demo-swap-1",
            "occurred_at": swapped_at, "card_slug": None, "player_slug": None,
            "rarity": None, "season_year": None, "season_class": None,
            "txn_type": "DIRECT_OFFER_CASH", "side": "SELL", "quantity": 1, "eur": 25.0,
            "wei": None, "counterparty": "another-manager", "is_cash_trade": 1,
            "ingested_at": stamp,
        }
    )

    db.upsert_many(connection, "card", cards, key="slug")
    db.upsert_many(connection, "txn", transactions, key="txn_key")
    db.upsert_many(connection, "price_obs", tape, key="obs_key")
    db.upsert_many(connection, "floor_snap", floors, key="snap_key")
    db.upsert_many(connection, "player_score", scores, key="score_key")

    db.upsert_many(
        connection,
        "reward",
        [
            {
                "reward_key": db.natural_key("demo-reward", week),
                "received_at": (now - timedelta(days=7 * week)).isoformat(timespec="seconds"),
                "gameweek": f"GW{40 - week}", "competition": random.choice(["Champion Europe", "Contender Europe", "Global All Star"]),
                "lineup": f"Lineup {random.randint(1, 3)}", "scarcity": random.choice(RARITIES),
                "cash_eur": round(random.choice([0, 0, 1.5, 4.0, 12.0]), 2),
                "card_slug": random.choice(cards)["slug"] if random.random() > 0.6 else None,
                "card_value_at_receipt": round(random.uniform(5, 60), 2) if random.random() > 0.6 else None,
                "essence_amount": random.choice([0, 250, 500, 1000]),
                "essence_scarcity": "LIMITED", "xp_amount": random.randint(0, 300), "source": "demo",
            }
            for week in range(16)
        ],
        key="reward_key",
    )

    db.upsert_many(
        connection,
        "essence_event",
        [
            {
                "event_key": db.natural_key("demo-essence", index),
                "occurred_on": (now - timedelta(days=index * 9)).date().isoformat(),
                "direction": "SPEND" if index % 3 else "EARN",
                "source": "craft" if index % 3 else "rewards",
                "scarcity": "LIMITED" if index % 2 else "RARE",
                "flavor": "Premier League", "amount": random.choice([500, 1000, 2000]),
                "craft_type": "standard", "base_cost": 1000.0, "clue_cost": random.choice([0, 150, 300]),
                "draw_type": random.choice(["Standard", "Full Roster", "Special Key", "Special Star", "Full Key"]),
                "card_slug": None, "card_tier": None,
                "card_value": round(random.uniform(3, 90), 2) if index % 3 else None,
                "notes": "demo",
            }
            for index in range(14)
        ],
        key="event_key",
    )

    db.upsert_many(
        connection,
        "cash_flow",
        [
            {"flow_key": db.natural_key("demo-flow", index), "occurred_on": (now - timedelta(days=300 - index * 40)).date().isoformat(),
             "direction": "DEPOSIT" if index % 4 else "WITHDRAWAL",
             "amount_eur": round(random.uniform(100, 600), 2), "method": "card", "notes": "demo"}
            for index in range(7)
        ],
        key="flow_key",
    )

    db.upsert_many(
        connection,
        "investment",
        [
            {
                "investment_key": db.natural_key("demo-inv", slug),
                "player_slug": slug, "player_name": name, "rarity": "limited", "quantity": 3,
                "avg_entry": 14.0, "target_price": 32.0, "downside_price": 9.0,
                "thesis": "Regains a starting role after the January window",
                "catalyst": "New manager appointed", "catalyst_date": (now + timedelta(days=45)).date().isoformat(),
                "status": "OPEN", "bear_prob": 0.25, "bear_price": 9.0, "base_prob": 0.45,
                "base_price": 18.0, "bull_prob": 0.25, "bull_price": 32.0, "extreme_prob": 0.05,
                "extreme_price": 60.0, "notes": "demo",
            }
            for slug, name, *_ in PLAYERS[:3]
        ],
        key="investment_key",
    )

    # A month of NAV history so the time-series charts are not a single dot.
    for day in range(30, 0, -1):
        taken = (now - timedelta(days=day)).isoformat(timespec="seconds")
        nav = 2400 * (1 + 0.004 * (30 - day)) * random.uniform(0.99, 1.01)
        connection.execute(
            "INSERT OR REPLACE INTO portfolio_snapshot (taken_at, cash_eur, cards_owned, "
            "acquisition_cost, market_value, quick_sale_value, nav, unrealized_pl, realized_pl, "
            "deposits, withdrawals, economic_pl, rewards_total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (taken, 150.0, len(cards), 2100.0, nav - 150, (nav - 150) * 0.95, nav, nav - 2250,
             120.0, 2000.0, 300.0, nav + 300 - 2000, 180.0),
        )
    connection.commit()
