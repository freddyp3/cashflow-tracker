"""SQLite store tracking the listing pool and its price cycle.

Each row is one live marketplace listing. `original_price` is the anchor the
cycle resets to; `current_price` decays weekly; `cycle_started_at` marks the
last fresh (re)post, and once it is RELIST_CYCLE_DAYS old the listing gets
deleted and reposted at the original price.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal

from config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL DEFAULT 'Grailed',
    listing_url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    original_price REAL NOT NULL,
    current_price REAL NOT NULL,
    cycle_started_at TEXT NOT NULL,       -- ISO date of last fresh post/repost
    last_action_at TEXT,                  -- ISO datetime of last automation touch
    active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS action_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL,
    action TEXT NOT NULL,                 -- 'price_drop' | 'relist' | 'error'
    detail TEXT,
    at TEXT NOT NULL
);
"""


@dataclass
class Listing:
    id: int
    platform: str
    listing_url: str
    title: str
    original_price: Decimal
    current_price: Decimal
    cycle_started_at: date
    active: bool


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.resolve(settings.relist_db_file))
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def _row_to_listing(row: sqlite3.Row) -> Listing:
    return Listing(
        id=row["id"],
        platform=row["platform"],
        listing_url=row["listing_url"],
        title=row["title"],
        original_price=Decimal(str(row["original_price"])),
        current_price=Decimal(str(row["current_price"])),
        cycle_started_at=date.fromisoformat(row["cycle_started_at"]),
        active=bool(row["active"]),
    )


def add_listing(listing_url: str, title: str, price: Decimal,
                platform: str = "Grailed") -> Listing:
    with _connect() as conn:
        conn.execute(
            "INSERT INTO listings (platform, listing_url, title, original_price, "
            "current_price, cycle_started_at) VALUES (?, ?, ?, ?, ?, ?)",
            (platform, listing_url, title, float(price), float(price),
             date.today().isoformat()),
        )
        row = conn.execute(
            "SELECT * FROM listings WHERE listing_url = ?", (listing_url,)
        ).fetchone()
    return _row_to_listing(row)


def active_listings(limit: int | None = None) -> list[Listing]:
    with _connect() as conn:
        sql = "SELECT * FROM listings WHERE active = 1 ORDER BY last_action_at ASC NULLS FIRST"
        if limit:
            sql += f" LIMIT {int(limit)}"
        rows = conn.execute(sql).fetchall()
    return [_row_to_listing(r) for r in rows]


def deactivate(listing_id: int) -> None:
    with _connect() as conn:
        conn.execute("UPDATE listings SET active = 0 WHERE id = ?", (listing_id,))


def record_price_drop(listing_id: int, new_price: Decimal) -> None:
    now = datetime.now().isoformat(timespec="seconds")
    with _connect() as conn:
        conn.execute(
            "UPDATE listings SET current_price = ?, last_action_at = ? WHERE id = ?",
            (float(new_price), now, listing_id),
        )
        conn.execute(
            "INSERT INTO action_log (listing_id, action, detail, at) VALUES (?, 'price_drop', ?, ?)",
            (listing_id, f"new_price={new_price}", now),
        )


def record_relist(listing_id: int, new_url: str) -> None:
    now = datetime.now().isoformat(timespec="seconds")
    with _connect() as conn:
        conn.execute(
            "UPDATE listings SET listing_url = ?, current_price = original_price, "
            "cycle_started_at = ?, last_action_at = ? WHERE id = ?",
            (new_url, date.today().isoformat(), now, listing_id),
        )
        conn.execute(
            "INSERT INTO action_log (listing_id, action, detail, at) VALUES (?, 'relist', ?, ?)",
            (listing_id, f"new_url={new_url}", now),
        )


def record_error(listing_id: int, detail: str) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT INTO action_log (listing_id, action, detail, at) VALUES (?, 'error', ?, ?)",
            (listing_id, detail[:500], datetime.now().isoformat(timespec="seconds")),
        )


def recent_log(limit: int = 50) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT l.title, a.action, a.detail, a.at FROM action_log a "
            "JOIN listings l ON l.id = a.listing_id ORDER BY a.id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]
