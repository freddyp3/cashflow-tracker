# Demo shot list (screen recording, no narration)

Prerequisites: `./scripts/demo-up.sh --fresh` (dummy data; nothing real on
screen); browser 1440 px wide; sidebar expanded; `prefers-reduced-motion`
off; a terminal window ready with `./scripts/demo-sale.sh` typed but not run.

| # | Route / command | Action | Hold | What must be visible |
|---|-----------------|--------|------|----------------------|
| 1 | `/` | Land, let KPIs/chart/globe render | 4 s | KPI cards with deltas, revenue/profit chart, rotating globe, best sellers, recent orders |
| 2 | `/visualization/globe` | Drag to stop rotation, hover two points, read the side panel | 5 s | Tooltip (location, orders, CA$), "N countries · M cities · X orders", top destinations |
| 3 | `/orders` | Land (default sort: date desc) | 3 s | Most recent order at the top with its date visible; IMPORTED badge on the seeded imported rows |
| 4 | `/orders` | Expand the imported draft row | 3 s | Items table + amber "Needs review" list |
| 5 | `/orders` | New order → fill Sale / Customer & shipping / Status / Items, save | 8 s | Inline validation on empty revenue, platform select, country select + city; row appears at the top with today's date |
| 6 | `/insights?tab=products` | Toggle series, switch month→day, sort by margin | 6 s | Top-3 margin highlight, in-cell bars, URL updates |
| 7 | `/insights?tab=platforms` | Change country filter | 3 s | Chart + table update together |
| 8 | Terminal | `curl -s localhost:8090/health` then `docker compose -p cashflow-demo logs -f worker` in a split | 4 s | `"mail":"directory","pubsub":"connected"`, worker idle on the subscription |
| 9 | Terminal | Run `./scripts/demo-sale.sh` | 4 s | "Published notification…" line; worker log shows `ingest: upserted Grailed order <listing> (draft=false)` |
| 10 | `/orders` | Switch to the browser, reload | 4 s | New `Jordan Avery` / `Portland, OR, USA` order at the top, today's date, IMPORTED badge, `Polo Ralph Lauren Big Pony Rugby Polo` item, not a draft |
| 11 | `/` | Home | 3 s | Recent orders shows the imported sale; Portland point on the globe. End |

## Cuts

If the recording runs over 60 s, trim shot 7 first, then shot 4.

The current `docs/cashflow-demo.mp4` predates this flow and should be replaced
when re-recorded.
