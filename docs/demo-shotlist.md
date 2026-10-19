# Demo shot list (screen recording, no narration)

Prerequisites: `cp .env.example .env && docker compose up --build`; real data loaded via
`DB_URL=jdbc:postgresql://localhost:5432/archivelol_db` for a native backend *or* the
compose DB seeded; browser 1440 px wide; sidebar expanded; `prefers-reduced-motion` off.

| # | Route / command | Action | Hold | What must be visible |
|---|-----------------|--------|------|----------------------|
| 1 | `/` | Land, wait for KPIs and globe to render | 4 s | 4 KPI cards with month-over-month deltas, revenue/profit chart, globe auto-rotating, best sellers, recent orders |
| 2 | `/` | Hover a globe point | 3 s | Tooltip with location, order count, CA$ revenue |
| 3 | `/visualization/globe` | Drag to stop rotation, hover a point, read the side panel | 5 s | "N countries · M cities · X orders", top destinations |
| 4 | `/orders` | Type a customer name into search, pick a platform filter | 4 s | Table narrows live; status badges visible |
| 5 | `/orders` | Click the Revenue header twice | 3 s | Sort indicator flips, rows reorder |
| 6 | `/orders` | Expand a row with the IMPORTED badge | 4 s | Items table and (if a draft) the amber "Needs review" list |
| 7 | `/orders` | New order → fill Sale / Customer & shipping / Status / Items in the drawer, save | 8 s | Inline validation on empty revenue, platform `<select>`, country select + city; row appears at top |
| 8 | `/` | Return home | 3 s | The new order's location is a new point on the globe (geocoded on save) |
| 9 | `/insights?tab=products` | Toggle Revenue/Profit/Cost series, switch month→day, sort by margin | 6 s | Top-3 margin rows highlighted, in-cell margin bars, URL query updates |
| 10 | `/insights?tab=platforms` | Change the country filter | 3 s | Chart and table update together |
| 11 | `/products` then `/personal-hauls` | Scroll | 4 s | CN¥ cost with CA$ equivalent, low-stock badge, hauls balance header |
| 12 | Terminal | `docker compose ps`, `curl localhost:8090/health`, `tail docs/benchmark.md` | 6 s | Six services healthy, `"pubsub":"connected"`, the benchmark table ending in the overall speedup line |

## Cuts

If the recording runs over 60 s, trim shots 2, 5, and 10 first.

The current `docs/cashflow-demo.mp4` predates this flow and should be replaced when
re-recorded.
