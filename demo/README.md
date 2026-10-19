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

## Teardown

```bash
docker compose -p cashflow-demo down        # keep the seeded volume
docker compose -p cashflow-demo down -v     # wipe everything
```
