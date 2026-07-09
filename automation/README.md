# Automation Service

Python/FastAPI service that automates the manual parts of the order tracker:

1. **Gmail ingest** — parses sale-confirmation emails from Grailed, Depop, and
   eBay into **draft orders** in the Spring Boot tracker (review them in the
   dashboard, then un-draft). Processed emails are labeled in Gmail so they are
   never imported twice.
2. **Relist service** — Playwright automation running a 30-day
   bump-then-reduce price cycle over a tracked pool of listings: a weekly
   price drop bumps each listing on Grailed; after 30 days the listing is
   deleted and reposted fresh at its original price.

```
automation/
├── main.py            # FastAPI app + APScheduler jobs
├── config.py          # settings loaded from .env
├── api_client.py      # Spring Boot tracker client (orders, products, FX)
├── gmail_ingest/
│   ├── auth.py        # Gmail OAuth (token cached in state/)
│   ├── parsers.py     # per-platform email parsers
│   └── ingest.py      # search -> parse -> draft order -> label pipeline
└── relist/
    ├── store.py       # SQLite listing pool + action log
    ├── grailed.py     # Playwright bot (login capture, price drop, repost)
    └── service.py     # weekly cycle logic
```

## Setup

```bash
cd automation
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
cp .env.example .env   # then edit values
```

### Gmail credentials (one-time)

1. In Google Cloud Console, create a project, enable the **Gmail API**, and
   create an **OAuth client ID** of type *Desktop app*.
2. Download the JSON to `automation/credentials/gmail_credentials.json`.
3. First ingest run opens a browser for consent; the token is cached in
   `state/gmail_token.json` after that.

### Grailed session (one-time)

```bash
python -m relist.grailed login   # log in manually in the opened browser
```

The session is saved to `state/grailed_auth.json` and reused headlessly.
Re-run this whenever Grailed logs the session out.

## Running

The Spring Boot tracker must be up (default `http://localhost:8080`).

```bash
uvicorn main:app --port 8100          # API + scheduled jobs
python -m gmail_ingest.ingest         # one-off Gmail import from the CLI
python -m relist.service              # one-off relist cycle from the CLI
```

Add listings to the relist pool:

```bash
curl -X POST localhost:8100/relist/listings \
  -H 'Content-Type: application/json' \
  -d '{"listingUrl": "https://www.grailed.com/listings/12345-penguin-shirt", "title": "National Geographic Penguin Shirt", "price": 45}'
```

| Endpoint | What it does |
| --- | --- |
| `POST /ingest/run` | Import sale emails as draft orders now |
| `POST /relist/run` | Run the bump/relist cycle now |
| `GET /relist/listings` | Tracked listing pool |
| `DELETE /relist/listings/{id}` | Stop tracking a listing |
| `GET /relist/log` | Recent price drops / relists / errors |

## Design notes & known gaps

- **Draft orders on purpose.** Imported orders land with `draft=true` so bad
  parses never silently pollute revenue stats; warnings (unmatched product,
  missing price) are written into the order note.
- **Email formats drift.** Parsers are regex-based and defensive; when a field
  can't be found the order is still created for manual completion. Tune the
  patterns in `gmail_ingest/parsers.py` against real emails from your inbox.
- **Grailed selectors drift too.** All selectors live in the `SELECTORS` dict
  in `relist/grailed.py`. Run with `RELIST_HEADED=true` to watch and fix.
- **Photo re-upload on repost is not implemented** — Grailed's sell form needs
  local files, not URLs. Reposted listings need photos added by hand until
  source photos are kept on disk and wired into `GrailedBot.repost`.
- **ToS caution:** marketplace automation can violate platform terms; keep
  volumes low (the 15-listing weekly batch cap exists for this reason).
