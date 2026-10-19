# Demo environment

**Everything in `demo/` is fictional dummy data — no real customers, orders
or emails.** The Grailed template's structure is real; every name, address,
price and ID in it was replaced.

An isolated compose stack (project `cashflow-demo`) seeded with 44 fake
orders, 10 products and 8 hauls, running the worker against the Pub/Sub
emulator with a **directory mail source** — `.eml` files dropped into
`demo/inbox/` are read instead of Gmail.

## Usage

```bash
./scripts/demo-up.sh          # build + start (use --fresh to wipe + reseed)
./scripts/demo-sale.sh        # simulate a Grailed sale email arriving
```

`demo-sale.sh` copies `demo/emails/grailed-sale.eml` into `demo/inbox/` with
a fresh timestamped name (and a new random listing ID unless `--keep-ref`),
then publishes a Gmail-style push notification to the emulator. The worker
pulls the notification, reads the new `.eml`, parses it, matches the seeded
`Polo Ralph Lauren Big Pony Rugby Polo` product, and upserts a non-draft
order via `PUT /api/orders/external/Grailed/<listing id>` — visible in the
UI at http://localhost:3000/orders within seconds.

## Options

- `demo-up.sh --fresh` — `down -v` the demo project first, then reseed.
- `demo-sale.sh --email <path>` — use a different .eml.
- `demo-sale.sh --keep-ref` — keep listing ID 204817365 (updates the existing
  order instead of creating a new one).
- `demo-sale.sh --emulator/--project/--topic` — override emulator target.

## Show the email arriving in Gmail

`./scripts/demo-sale.sh --gmail` also delivers the generated `.eml` to a real
inbox via Gmail SMTP, so on camera the email lands and seconds later the
order appears in the tracker.

1. On the Google Account, enable **2-Step Verification** (Security).
2. Create an **App password** (Security → 2-Step Verification → App
   passwords).
3. Set the keys in `.env` (see `.env.example`): `DEMO_GMAIL_USER` (the Gmail
   address), `DEMO_GMAIL_APP_PASSWORD` (the 16-char app password), and
   optionally `DEMO_GMAIL_TO` (recipient; defaults to `DEMO_GMAIL_USER`).

Then `./scripts/demo-sale.sh --gmail` sends first and publishes to the
emulator only if the send succeeded. Gmail rewrites the sender of
SMTP-submitted mail to your own address; the subject and the Grailed HTML
body are preserved. The tracker is updated by the emulator path, not by
reading Gmail.

## Teardown

```bash
docker compose -p cashflow-demo down        # keep the seeded volume
docker compose -p cashflow-demo down -v     # wipe everything
```
