"""The 30-day bump-then-reduce price cycle.

Weekly run over the active listing pool (up to RELIST_BATCH_SIZE listings):

  - Listing younger than RELIST_CYCLE_DAYS: drop its price by
    RELIST_WEEKLY_DROP_PCT (Grailed bumps the listing on a price drop),
    but never below RELIST_MIN_PRICE_FRACTION of the original price —
    once at the floor it just waits for the cycle to end.
  - Listing older than RELIST_CYCLE_DAYS: delete it and repost fresh at the
    original price, resetting the cycle. A fresh listing gets Grailed's
    new-listing visibility, which a stale discounted one no longer has.

One listing failing (changed selectors, deleted item) logs an error row and
the run continues.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from config import settings
from relist import store
from relist.grailed import GrailedBot

log = logging.getLogger(__name__)


@dataclass
class RelistReport:
    price_drops: int = 0
    relists: int = 0
    at_floor: int = 0
    errors: list[str] = field(default_factory=list)


def _next_price(listing: store.Listing) -> Decimal | None:
    """New weekly price, or None if the listing is already at its floor."""
    floor = (listing.original_price * Decimal(str(settings.relist_min_price_fraction)))
    drop = Decimal(str(1 - settings.relist_weekly_drop_pct / 100))
    candidate = (listing.current_price * drop).quantize(Decimal("1"), ROUND_HALF_UP)
    if candidate < floor.quantize(Decimal("1"), ROUND_HALF_UP):
        return None
    # Grailed requires whole-dollar drops; identical price means no bump.
    if candidate >= listing.current_price:
        candidate = listing.current_price - Decimal("1")
    return candidate


def run_relist_cycle() -> RelistReport:
    report = RelistReport()
    listings = store.active_listings(limit=settings.relist_batch_size)
    if not listings:
        log.info("No active listings to process")
        return report

    with GrailedBot() as bot:
        for listing in listings:
            try:
                age_days = (date.today() - listing.cycle_started_at).days
                if age_days >= settings.relist_cycle_days:
                    details = bot.scrape_listing(listing.listing_url)
                    bot.delete_listing(listing.listing_url)
                    new_url = bot.repost(details, listing.original_price)
                    store.record_relist(listing.id, new_url)
                    report.relists += 1
                else:
                    new_price = _next_price(listing)
                    if new_price is None:
                        report.at_floor += 1
                        continue
                    bot.drop_price(listing.listing_url, new_price)
                    store.record_price_drop(listing.id, new_price)
                    report.price_drops += 1
            except Exception as exc:
                store.record_error(listing.id, str(exc))
                report.errors.append(f"{listing.title}: {exc}")
                log.exception("Relist action failed for %s", listing.listing_url)

    return report


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    r = run_relist_cycle()
    print(f"drops={r.price_drops} relists={r.relists} at_floor={r.at_floor} errors={len(r.errors)}")
    for e in r.errors:
        print("  FAIL:", e)
