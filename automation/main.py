"""FastAPI entrypoint for the automation service.

Endpoints (all also runnable ad hoc from the CLI, see README):
  POST /ingest/run          - run the Gmail -> draft-order import now
  POST /relist/run          - run the weekly bump/relist cycle now
  GET  /relist/listings     - view the tracked listing pool
  POST /relist/listings     - add a listing to the pool
  DELETE /relist/listings/{id} - stop tracking a listing
  GET  /relist/log          - recent automation actions
  GET  /health

Scheduled jobs (APScheduler, in-process):
  - Gmail ingest every SCHEDULE_INGEST_MINUTES minutes
  - Relist cycle on SCHEDULE_RELIST_CRON (default Monday 09:00)

Playwright and the Gmail client are synchronous, so scheduled/endpoint runs
execute in a worker thread to keep the event loop responsive.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from decimal import Decimal

import anyio
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from config import settings
from gmail_ingest.ingest import run_ingest
from relist import store
from relist.service import run_relist_cycle

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("automation")

scheduler = BackgroundScheduler()


def _scheduled_ingest():
    report = run_ingest()
    log.info("Scheduled ingest: scanned=%s created=%s failures=%s",
             report.scanned, report.created, len(report.failures))


def _scheduled_relist():
    report = run_relist_cycle()
    log.info("Scheduled relist: drops=%s relists=%s errors=%s",
             report.price_drops, report.relists, len(report.errors))


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.schedule_ingest_minutes > 0:
        scheduler.add_job(_scheduled_ingest, "interval",
                          minutes=settings.schedule_ingest_minutes, id="gmail_ingest")
    scheduler.add_job(_scheduled_relist,
                      CronTrigger.from_crontab(settings.schedule_relist_cron),
                      id="relist_cycle")
    scheduler.start()
    log.info("Scheduler started (ingest every %s min, relist cron '%s')",
             settings.schedule_ingest_minutes, settings.schedule_relist_cron)
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="Inventory & Sales Automation", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok", "trackerApi": settings.tracker_api_url}


# -- Gmail ingest -----------------------------------------------------------

@app.post("/ingest/run")
async def ingest_now():
    report = await anyio.to_thread.run_sync(run_ingest)
    return {
        "scanned": report.scanned,
        "created": report.created,
        "skipped": report.skipped,
        "failures": report.failures,
        "createdOrders": report.created_orders,
    }


# -- Relist -----------------------------------------------------------------

class NewListing(BaseModel):
    listingUrl: str
    title: str
    price: Decimal
    platform: str = "Grailed"


@app.post("/relist/run")
async def relist_now():
    report = await anyio.to_thread.run_sync(run_relist_cycle)
    return {
        "priceDrops": report.price_drops,
        "relists": report.relists,
        "atFloor": report.at_floor,
        "errors": report.errors,
    }


@app.get("/relist/listings")
def list_listings():
    return [
        {
            "id": l.id,
            "platform": l.platform,
            "title": l.title,
            "listingUrl": l.listing_url,
            "originalPrice": float(l.original_price),
            "currentPrice": float(l.current_price),
            "cycleStartedAt": l.cycle_started_at.isoformat(),
        }
        for l in store.active_listings()
    ]


@app.post("/relist/listings", status_code=201)
def add_listing(body: NewListing):
    try:
        listing = store.add_listing(body.listingUrl, body.title, body.price, body.platform)
    except Exception as exc:
        raise HTTPException(status_code=409, detail=f"Could not add listing: {exc}")
    return {"id": listing.id, "title": listing.title}


@app.delete("/relist/listings/{listing_id}", status_code=204)
def remove_listing(listing_id: int):
    store.deactivate(listing_id)


@app.get("/relist/log")
def relist_log(limit: int = 50):
    return store.recent_log(limit)
