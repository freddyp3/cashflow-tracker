/**
 * Insights page: one /insights route with Products / Platforms tabs.
 * Each tab has a sortable stats table (top-3 margin rows highlighted, margin
 * drawn as an in-cell bar), a Revenue/Profit/Cost-togglable Monthly/Daily
 * line chart, and a shared filter bar. Tab + filters live in the URL query.
 */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getProductStats,
  getPlatformStats,
  getProductMonth,
  getProductDay,
  getPlatformMonth,
  getPlatformDay,
} from '../api/stats';
import { getCountries, getPlatforms } from '../api/meta';
import { getProducts } from '../api/products';
import { Skeleton, TableSkeleton, ErrorState } from '../components/ui';
import StatsFilters from '../components/stats/StatsFilters';
import StatsTable, { type StatsColumn } from '../components/stats/StatsTable';
import TimeSeriesChart, { type SeriesKey } from '../components/stats/TimeSeriesChart';
import { parseInsights, serializeInsights, sumByPeriod, type InsightsState, type Tab } from '../components/stats/insightsState';

const productColumns: StatsColumn[] = [
  { key: 'product_name', label: 'Product' },
  { key: 'units_sold', label: 'Units', format: 'number' },
  { key: 'product_total_revenue', label: 'Revenue', format: 'currency' },
  { key: 'product_total_cost', label: 'Cost', format: 'currency' },
  { key: 'product_total_profit', label: 'Profit', format: 'currency' },
  { key: 'product_profit_margin', label: 'Margin', format: 'margin' },
  { key: 'avg_product_revenue', label: 'Avg Revenue', format: 'currency' },
  { key: 'product_total_refunded', label: 'Refunded (CN¥)', format: 'cny' },
  { key: 'product_net_refund', label: 'Net Refund (CN¥)', format: 'cny' },
];

const platformColumns: StatsColumn[] = [
  { key: 'platform', label: 'Platform' },
  { key: 'units_sold', label: 'Units', format: 'number' },
  { key: 'platform_revenue', label: 'Revenue', format: 'currency' },
  { key: 'platform_total_cost', label: 'Cost', format: 'currency' },
  { key: 'platform_profit', label: 'Profit', format: 'currency' },
  { key: 'platform_profit_margin', label: 'Margin', format: 'margin' },
  { key: 'avg_platform_revenue', label: 'Avg Revenue', format: 'currency' },
  { key: 'platform_refunded', label: 'Refunded (CN¥)', format: 'cny' },
  { key: 'platform_net_refund', label: 'Net Refund (CN¥)', format: 'cny' },
];

const SERIES_DEFS: { key: SeriesKey; name: string; color: string }[] = [
  { key: 'revenue', name: 'Revenue', color: '#f59e0b' },
  { key: 'profit', name: 'Profit', color: '#10b981' },
  { key: 'cost', name: 'Cost', color: '#6b7280' },
];

const pill = (active: boolean) =>
  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    active ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
  }`;

export default function InsightsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = parseInsights(searchParams);
  const { tab, country, platform, product, granularity } = state;
  const countryParam = country || undefined;

  const columns = tab === 'products' ? productColumns : platformColumns;
  const revenueKey = tab === 'products' ? 'product_total_revenue' : 'platform_revenue';
  const marginKey = tab === 'products' ? 'product_profit_margin' : 'platform_profit_margin';

  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: revenueKey, dir: 'desc' });
  const [sortTab, setSortTab] = useState<Tab>(tab);
  const [series, setSeries] = useState<SeriesKey[]>(['revenue', 'profit', 'cost']);
  if (sortTab !== tab) {
    setSortTab(tab);
    setSort({ key: revenueKey, dir: 'desc' });
  }

  const update = (patch: Partial<InsightsState>) => {
    setSearchParams(serializeInsights({ ...state, ...patch }), { replace: true });
  };

  const switchTab = (next: Tab) => {
    update({ tab: next, platform: '', product: null });
  };

  const onSort = (key: string) => {
    setSort((cur) =>
      cur.key === key
        ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: columns.find((c) => c.key === key)?.format ? 'desc' : 'asc' },
    );
  };

  const toggleSeries = (key: SeriesKey) => {
    setSeries((cur) => {
      if (cur.includes(key)) return cur.length === 1 ? cur : cur.filter((k) => k !== key);
      return [...cur, key];
    });
  };

  const { data: countries = [] } = useQuery({ queryKey: ['meta-countries'], queryFn: getCountries });
  const { data: platforms = [] } = useQuery({ queryKey: ['meta-platforms'], queryFn: getPlatforms });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });

  const statsQuery = useQuery({
    queryKey: ['insights-stats', tab, countryParam],
    queryFn: () => (tab === 'products' ? getProductStats(countryParam) : getPlatformStats(countryParam)),
  });

  const chartQuery = useQuery({
    queryKey: ['insights-time', tab, granularity, product, platform, countryParam],
    queryFn: () =>
      tab === 'products'
        ? granularity === 'month'
          ? getProductMonth(product ?? undefined, countryParam)
          : getProductDay(product ?? undefined, countryParam)
        : granularity === 'month'
          ? getPlatformMonth(platform || undefined, countryParam)
          : getPlatformDay(platform || undefined, countryParam),
  });

  const stats = statsQuery.data ?? [];
  const filtered =
    tab === 'products'
      ? product == null
        ? stats
        : stats.filter((row) => Number(row.product_id) === product)
      : platform === ''
        ? stats
        : stats.filter((row) => row.platform === platform);

  const xKey = granularity === 'month' ? 'month' : 'day';
  const valueKeys = useMemo(() => SERIES_DEFS.map((s) => `${xKey}_${s.key}`), [xKey]);
  // With no entity selected, the month/day views return one row per product or
  // platform per period — collapse to one row per period so the X axis is
  // monotonic. With a filter, rows are already per-period but still sorted.
  const chartData = useMemo(() => {
    const rows = chartQuery.data ?? [];
    const unfiltered = tab === 'products' ? product == null : platform === '';
    if (unfiltered) return sumByPeriod(rows, xKey, valueKeys);
    return [...rows].sort((a, b) => String(a[xKey]).localeCompare(String(b[xKey])));
  }, [chartQuery.data, tab, product, platform, xKey, valueKeys]);
  const lines = SERIES_DEFS.map((s) => ({
    dataKey: `${xKey}_${s.key}`,
    color: s.color,
    name: s.name,
  }));
  const subject =
    tab === 'products'
      ? product != null
        ? products.find((p) => p.productId === product)?.productName ?? 'Product'
        : 'All Products'
      : platform || 'All Platforms';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Insights</h1>
        <StatsFilters
          country={country}
          onCountryChange={(c) => update({ country: c })}
          tab={tab}
          platform={platform}
          onPlatformChange={(p) => update({ platform: p })}
          product={product}
          onProductChange={(p) => update({ product: p })}
          platforms={platforms}
          countries={countries}
          products={products}
        />
      </div>

      <div role="tablist" aria-label="Insights sections" className="flex gap-2 mb-4">
        <button
          type="button"
          role="tab"
          id="tab-products"
          aria-controls="panel-products"
          aria-selected={tab === 'products'}
          onClick={() => switchTab('products')}
          className={pill(tab === 'products')}
        >
          Products
        </button>
        <button
          type="button"
          role="tab"
          id="tab-platforms"
          aria-controls="panel-platforms"
          aria-selected={tab === 'platforms'}
          onClick={() => switchTab('platforms')}
          className={pill(tab === 'platforms')}
        >
          Platforms
        </button>
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        <div className="mb-6">
          {statsQuery.isLoading ? (
            <TableSkeleton />
          ) : statsQuery.isError ? (
            <ErrorState onRetry={() => statsQuery.refetch()} />
          ) : (
            <StatsTable
              data={filtered}
              columns={columns}
              sortKey={sort.key}
              sortDir={sort.dir}
              onSort={onSort}
              highlightKey={marginKey}
            />
          )}
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={granularity === 'month'}
              onClick={() => update({ granularity: 'month' })}
              className={pill(granularity === 'month')}
            >
              Monthly
            </button>
            <button
              type="button"
              aria-pressed={granularity === 'day'}
              onClick={() => update({ granularity: 'day' })}
              className={pill(granularity === 'day')}
            >
              Daily
            </button>
          </div>
          <div role="group" aria-label="Chart series" className="flex gap-2">
            {SERIES_DEFS.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={series.includes(s.key)}
                onClick={() => toggleSeries(s.key)}
                className={pill(series.includes(s.key))}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {chartQuery.isLoading ? (
          <Skeleton className="h-[300px]" />
        ) : chartQuery.isError ? (
          <ErrorState onRetry={() => chartQuery.refetch()} />
        ) : (
          <TimeSeriesChart
            data={chartData}
            xKey={xKey}
            title={`${subject} — ${granularity === 'month' ? 'Monthly' : 'Daily'} Trends`}
            granularity={granularity}
            lines={lines}
            series={series}
          />
        )}
      </div>
    </div>
  );
}
