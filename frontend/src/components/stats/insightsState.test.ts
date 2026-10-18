import { DEFAULT_INSIGHTS, parseInsights, serializeInsights, sumByPeriod } from './insightsState';

describe('parseInsights', () => {
  it('returns defaults for an empty query', () => {
    expect(parseInsights(new URLSearchParams())).toEqual(DEFAULT_INSIGHTS);
  });

  it('falls back to defaults on invalid tab/granularity/product', () => {
    const s = parseInsights(new URLSearchParams('tab=nonsense&granularity=hour&product=abc'));
    expect(s.tab).toBe('products');
    expect(s.granularity).toBe('month');
    expect(s.product).toBeNull();
  });

  it('parses a full query', () => {
    const s = parseInsights(new URLSearchParams('tab=platforms&country=Canada&platform=Grailed&product=3&granularity=day'));
    expect(s).toEqual({ tab: 'platforms', country: 'Canada', platform: 'Grailed', product: 3, granularity: 'day' });
  });

  it('rejects non-positive products', () => {
    expect(parseInsights(new URLSearchParams('product=0')).product).toBeNull();
    expect(parseInsights(new URLSearchParams('product=-2')).product).toBeNull();
    expect(parseInsights(new URLSearchParams('product=1.5')).product).toBeNull();
  });
});

describe('serializeInsights', () => {
  it('omits defaults', () => {
    expect(serializeInsights(DEFAULT_INSIGHTS).toString()).toBe('');
    expect(serializeInsights({ ...DEFAULT_INSIGHTS, tab: 'platforms' }).toString()).toBe('tab=platforms');
  });

  it('serialises in key order', () => {
    const s = serializeInsights({
      tab: 'platforms',
      country: 'Canada',
      platform: 'Grailed',
      product: 3,
      granularity: 'day',
    });
    expect(s.toString()).toBe('tab=platforms&country=Canada&platform=Grailed&product=3&granularity=day');
  });

  it('round-trips', () => {
    const s = { tab: 'platforms' as const, country: 'Canada', platform: 'eBay', product: 7, granularity: 'day' as const };
    expect(parseInsights(serializeInsights(s))).toEqual(s);
  });
});

describe('sumByPeriod', () => {
  it('sums two products in the same months into one sorted row per period', () => {
    const rows = [
      { month: '2025-08-01', month_revenue: 100, month_profit: 40, month_cost: 60 },
      { month: '2025-07-01', month_revenue: 10, month_profit: 4, month_cost: 6 },
      { month: '2025-08-01', month_revenue: 50, month_profit: 20, month_cost: 30 },
      { month: '2025-07-01', month_revenue: 30, month_profit: 12, month_cost: 18 },
    ];
    expect(sumByPeriod(rows, 'month', ['month_revenue', 'month_profit', 'month_cost'])).toEqual([
      { month: '2025-07-01', month_revenue: 40, month_profit: 16, month_cost: 24 },
      { month: '2025-08-01', month_revenue: 150, month_profit: 60, month_cost: 90 },
    ]);
  });

  it('drops rows with a null period and treats missing values as 0', () => {
    const rows = [
      { month: null, month_revenue: 5 },
      { month: '2025-08-01' },
      { month: '2025-08-01', month_revenue: 7 },
    ];
    expect(sumByPeriod(rows, 'month', ['month_revenue'])).toEqual([
      { month: '2025-08-01', month_revenue: 7 },
    ]);
  });
});
