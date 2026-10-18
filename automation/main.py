"""FastAPI entrypoint for the automation service.

Endpoints (all also runnable ad hoc from the CLI, see README):
  POST /ingest/run          - run the Gmail -> draft-order import now
  GET  /health

Scheduled jobs (APScheduler, in-process):
  - Gmail ingest every SCHEDULE_INGEST_MINUTES minutes

The Gmail client is synchronous, so scheduled/endpoint runs execute in a
worker thread to keep the event loop responsive.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

import anyio
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI

from config import settings
from gmail_ingest.ingest import run_ingest

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("automation")

scheduler = BackgroundScheduler()


def _scheduled_ingest():
    report = run_ingest()
    log.info("Scheduled ingest: scanned=%s created=%s failures=%s",
             report.scanned, report.created, len(report.failures))


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.schedule_ingest_minutes > 0:
        scheduler.add_job(_scheduled_ingest, "interval",
                          minutes=settings.schedule_ingest_minutes, id="gmail_ingest")
    scheduler.start()
    log.info("Scheduler started (ingest every %s min)",
             settings.schedule_ingest_minutes)
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
