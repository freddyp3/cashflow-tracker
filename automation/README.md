# Automation Service

Python/FastAPI service that automates the manual parts of the order tracker:

1. **Gmail ingest** — parses sale-confirmation emails from Grailed, Depop, and
   eBay into **draft orders** in the Spring Boot tracker (review them in the
   dashboard, then un-draft). Processed emails are labeled in Gmail so they are
   never imported twice.

```
automation/
├── main.py            # FastAPI app + APScheduler jobs
├── config.py          # settings loaded from .env
├── api_client.py      # Spring Boot tracker client (orders, products, FX)
├── gmail_ingest/
│   ├── auth.py        # Gmail OAuth (token cached in state/)
│   ├── parsers.py     # per-platform email parsers
│   └── ingest.py      # search -> parse -> draft order -> label pipeline
```

## Setup

```bash
cd automation
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit values
```

### Gmail credentials (one-time)

1. In Google Cloud Console, create a project, enable the **Gmail API**, and
   create an **OAuth client ID** of type *Desktop app*.
2. Download the JSON to `automation/credentials/gmail_credentials.json`.
3. First ingest run opens a browser for consent; the token is cached in
   `state/gmail_token.json` after that.

## Running

The Spring Boot tracker must be up (default `http://localhost:8080`).

```bash
uvicorn main:app --port 8100          # API + scheduled jobs
python -m gmail_ingest.ingest         # one-off Gmail import from the CLI
```

| Endpoint | What it does |
| --- | --- |
| `POST /ingest/run` | Import sale emails as draft orders now |

## Design notes & known gaps

- **Draft orders on purpose.** Imported orders land with `draft=true` so bad
  parses never silently pollute revenue stats; warnings (unmatched product,
  missing price) are written into the order note.
- **Email formats drift.** Parsers are regex-based and defensive; when a field
  can't be found the order is still created for manual completion. Tune the
  patterns in `gmail_ingest/parsers.py` against real emails from your inbox.
