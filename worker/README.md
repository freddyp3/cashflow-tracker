# worker — Gmail → Pub/Sub → orders

A Go service that ingests marketplace sale-confirmation emails into the tracker.
Gmail `watch()` pushes new-mail notifications to a Pub/Sub topic; the worker
streaming-pulls them, fetches and parses each email (Grailed / Depop / eBay),
and upserts exactly one order per marketplace order ID via the Spring API.
Unparseable or repeatedly failing messages are nacked and dead-lettered.

## Architecture

Gmail `watch()` → Pub/Sub topic → pull subscription (worker, goroutine pool) →
`PUT /api/orders/external/{platform}/{ref}`; failures → nack → dead-letter
topic after N attempts.

## Production setup

1. Create the GCP resources (topic, DLQ topic, subscription with
   `deadLetterPolicy`, IAM bindings, service account):

   ```bash
   PUBSUB_PROJECT_ID=my-project ./scripts/gcp-setup.sh
   ```

   The script is idempotent and grants the two service identities Pub/Sub
   needs: `gmail-api-push@system.gserviceaccount.com` (publishes notifications)
   gets `roles/pubsub.publisher` on the topic, and the project's Pub/Sub
   service agent gets publisher on the DLQ topic plus subscriber on the
   subscription (required for `deadLetterPolicy` to work).

2. Create a key for the worker service account:

   ```bash
   gcloud iam service-accounts keys create worker/credentials/gcp-service-account.json \
     --iam-account=cashflow-worker@my-project.iam.gserviceaccount.com --project=my-project
   ```

   `worker/credentials/` is git-ignored and mounted read-only at `/secrets`.

3. Gmail OAuth: in the same project create an OAuth client (Desktop type),
   configure the consent screen with scopes `gmail.readonly` and
   `gmail.modify`, mint a refresh token, and save it as
   `worker/credentials/gmail_token.json` — the `Credentials.to_json()` shape
   with `client_id`, `client_secret`, `refresh_token`, `token_uri`.

4. In `.env`, set `PUBSUB_PROJECT_ID=my-project` (see `.env.example`).

5. Run the worker in production mode:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build worker
   ```

   The override drops `PUBSUB_EMULATOR_HOST`, so the worker uses Application
   Default Credentials (`GOOGLE_APPLICATION_CREDENTIALS`) against real
   Pub/Sub. In production mode the worker does **not** create topics or
   subscriptions — step 1 must have run.

6. Verify:

   ```bash
   curl localhost:8090/health   # → "gmail":"configured","pubsub":"connected"
   gcloud pubsub subscriptions describe gmail-notifications-worker \
     --format='value(deadLetterPolicy)'
   ```

   Send yourself a test sale email and watch `docker compose logs -f worker`.

## Operations

- **Watch renewal** — the worker calls `watch()` on
  `projects/<PUBSUB_PROJECT_ID>/topics/<PUBSUB_TOPIC>` every
  `WATCH_RENEW_INTERVAL` (default 24h; Gmail expires watches after 7 days).
  On the first `watch()` it writes the returned `historyId` to
  `GMAIL_HISTORY_FILE` (`/state/history_id`) so the first notification has a
  baseline.
- **Dead letters** — on real Pub/Sub the subscription's native
  `deadLetterPolicy` routes messages after `WORKER_MAX_ATTEMPTS`; the worker
  only nacks. To inspect the DLQ, create a subscription on the dead-letter
  topic and pull it: `gcloud pubsub subscriptions pull <dlq-sub> --auto-ack`.
- **Re-driving** — delete `/state/history_id` (the `workerstate` volume) to
  re-sync from the next watch's fresh baseline.
- **Concurrency** — `WORKER_CONCURRENCY` sets the goroutine pool size / max
  outstanding messages.
- **State volume** — `/state` is a named volume (`workerstate`) owned by the
  worker user via the image. If a volume was created by an image older than
  this fix it will be root-owned and every ingest fails with
  `persist history id`; remove it once (`docker volume rm
  <project>_workerstate`) and restart.

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
| `GOOGLE_APPLICATION_CREDENTIALS` | _(unset)_ | Service-account key for Pub/Sub; required when `PUBSUB_EMULATOR_HOST` is unset |
| `MAIL_SOURCE_DIR` | _(unset)_ | Demo/local: read .eml files from this directory instead of Gmail (cursor = file name) |
| `PUBSUB_EMULATOR_HOST` | _(unset)_ | When set, connect to the emulator and auto-create topic/subscription/DLQ |

## Local development (emulator)

```bash
docker compose up -d pubsub-emulator worker
```

Health: `GET http://localhost:8090/health` →
`{"status":"ok","gmail":"configured"|"missing","pubsub":"connected"}`.

Without a Gmail token the worker starts fine (`"gmail":"missing"`), logs a
warning, and skips the watch renewer — everything else still works.

On the emulator the worker auto-creates the topic, subscription and DLQ, and
simulates dead-lettering by counting attempts — after `WORKER_MAX_ATTEMPTS`
nacks the message is republished to the DLQ topic with a `reason` attribute
and then acked — because the emulator does not enforce `deadLetterPolicy`.

**Demo mode** — with `MAIL_SOURCE_DIR` set the worker reads `.eml` files from
a directory instead of Gmail (the history-ID cursor is the file's base name,
so timestamped names order correctly). Useful for replaying saved sale
emails locally.

```bash
docker compose run --rm worker-test   # go vet + go test (emulator tests need pubsub-emulator up)
```
