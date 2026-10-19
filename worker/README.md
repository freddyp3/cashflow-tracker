# worker — Gmail → Pub/Sub → orders

A Go service that ingests marketplace sale-confirmation emails into the tracker.
Gmail `watch()` pushes new-mail notifications to a Pub/Sub topic; the worker
streaming-pulls them, fetches and parses each email (Grailed / Depop / eBay),
and upserts exactly one order per marketplace order ID via the Spring API.
Unparseable or repeatedly failing messages are nacked and dead-lettered.

## Running

```bash
docker compose up -d pubsub-emulator worker
```

Health: `GET http://localhost:8090/health` →
`{"status":"ok","gmail":"configured"|"missing","pubsub":"connected"}`.

Without a Gmail token the worker starts fine (`"gmail":"missing"`), logs a
warning, and skips the watch renewer — everything else still works.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PUBSUB_PROJECT_ID` | `cashflow-local` | GCP project ID |
| `PUBSUB_TOPIC` | `gmail-notifications` | Notification topic |
| `PUBSUB_SUBSCRIPTION` | `gmail-notifications-worker` | Pull subscription |
| `PUBSUB_DLQ_TOPIC` | `gmail-notifications-dlq` | Dead-letter topic |
| `WORKER_CONCURRENCY` | `4` | Max outstanding messages / goroutine pool size |
| `WORKER_MAX_ATTEMPTS` | `5` | Delivery attempts before dead-lettering |
| `TRACKER_API_URL` | `http://localhost:8080` | Spring API base URL |
| `GMAIL_USER` | `me` | Gmail user for watch/messages calls |
| `GMAIL_TOKEN_FILE` | `/secrets/gmail_token.json` | OAuth token JSON path |
| `GMAIL_HISTORY_FILE` | `/state/history_id` | Persisted historyId file |
| `WATCH_RENEW_INTERVAL` | `24h` | Gmail watch renewal interval |
| `HEALTH_ADDR` | `:8090` | Health server listen address |
| `PUBSUB_EMULATOR_HOST` | _(unset)_ | When set, connect to the emulator and auto-create topic/subscription/DLQ |

## Gmail setup

Drop an OAuth token JSON — the `Credentials.to_json()` shape with `client_id`,
`client_secret`, `refresh_token`, `token_uri` — at
`worker/credentials/gmail_token.json` (git-ignored; mounted at `/secrets` in
compose). On the first `watch()` the worker writes the returned `historyId` to
`GMAIL_HISTORY_FILE` so the first notification has a baseline.

## Tests

```bash
docker compose run --rm worker-test   # go vet + go test (emulator tests need pubsub-emulator up)
```

## Dead letters

On real Pub/Sub, the subscription's native `deadLetterPolicy` routes messages
after `WORKER_MAX_ATTEMPTS`. On the emulator the worker simulates it: after
`MaxAttempts` nacks the message is republished to the DLQ topic with a `reason`
attribute and then acked.
