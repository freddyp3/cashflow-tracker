/** URL query-string state for the Insights page. */

export type Tab = 'products' | 'platforms';
export type Granularity = 'month' | 'day';

export interface InsightsState {
  tab: Tab;
  country: string;
  platform: string;
  product: number | null;
  granularity: Granularity;
}

export const DEFAULT_INSIGHTS: InsightsState = {
  tab: 'products',
  country: '',
  platform: '',
  product: null,
  granularity: 'month',
};

/** Parses URLSearchParams; invalid/missing values fall back to defaults. */
export function parseInsights(search: URLSearchParams): InsightsState {
  const tab: Tab = search.get('tab') === 'platforms' ? 'platforms' : 'products';
  const country = search.get('country') ?? '';
  const platform = search.get('platform') ?? '';
  const rawProduct = search.get('product');
  const parsed = rawProduct === null ? NaN : Number(rawProduct);
  const product = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  const granularity: Granularity = search.get('granularity') === 'day' ? 'day' : 'month';
  return { tab, country, platform, product, granularity };
}

/** Serialises state, omitting defaults; key order is fixed for stable URLs. */
export function serializeInsights(s: InsightsState): URLSearchParams {
  const params = new URLSearchParams();
  if (s.tab !== DEFAULT_INSIGHTS.tab) params.set('tab', s.tab);
  if (s.country !== '') params.set('country', s.country);
  if (s.platform !== '') params.set('platform', s.platform);
  if (s.product !== null) params.set('product', String(s.product));
  if (s.granularity !== DEFAULT_INSIGHTS.granularity) params.set('granularity', s.granularity);
  return params;
}

type Row = Record<string, unknown>;

/**
 * Collapses per-entity time-series rows (one per product/platform per period)
 * into one row per period by summing each of `valueKeys`. Sorted ascending by
 * the period string; rows without a period are dropped.
 */
export function sumByPeriod(rows: Row[], xKey: string, valueKeys: string[]): Row[] {
  const byPeriod = new Map<string, Row>();
  for (const row of rows) {
    const period = row[xKey];
    if (period == null) continue;
    const key = String(period);
    let acc = byPeriod.get(key);
    if (!acc) {
      acc = { [xKey]: key };
      byPeriod.set(key, acc);
    }
    for (const k of valueKeys) {
      acc[k] = Number(acc[k] ?? 0) + Number(row[k] ?? 0);
    }
  }
  return [...byPeriod.values()].sort((a, b) => String(a[xKey]).localeCompare(String(b[xKey])));
}
