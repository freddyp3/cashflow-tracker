/**
 * Product analytics page showing:
 * - Stats table with revenue, cost, profit, margins, and refund data per product
 * - Toggle between "All Products" and "By Platform" views
 * - Time-series line chart (monthly or daily granularity) for revenue/profit/cost trends
 * - Product selector to filter the chart by a specific product
 * - Country and platform filter dropdowns
 *
 * Data comes from PostgreSQL views: vw_product_stats, vw_product_by_platform_stats,
 * vw_product_month, and vw_product_day.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProductStats, getProductByPlatformStats, getProductMonth, getProductDay } from '../api/stats';
import { getProducts } from '../api/products';
import StatsFilters from '../components/stats/StatsFilters';
import StatsTable from '../components/stats/StatsTable';
import TimeSeriesChart from '../components/stats/TimeSeriesChart';

const productColumns = [
  { key: 'product_name', label: 'Product' },
  { key: 'units_sold', label: 'Units', format: 'number' as const },
  { key: 'product_total_revenue', label: 'Revenue', format: 'currency' as const },
  { key: 'product_total_cost', label: 'Cost', format: 'currency' as const },
  { key: 'product_total_profit', label: 'Profit', format: 'currency' as const },
  { key: 'product_profit_margin', label: 'Margin', format: 'percent' as const },
  { key: 'avg_product_revenue', label: 'Avg Revenue', format: 'currency' as const },
  { key: 'avg_product_profit', label: 'Avg Profit', format: 'currency' as const },
  { key: 'product_total_refunded', label: 'Refunded', format: 'cny' as const },
  { key: 'product_net_refund', label: 'Net Refund', format: 'cny' as const },
];

const productByPlatformColumns = [
  { key: 'product_name', label: 'Product' },
  { key: 'platform', label: 'Platform' },
  { key: 'units_sold', label: 'Units', format: 'number' as const },
  { key: 'product_total_revenue', label: 'Revenue', format: 'currency' as const },
  { key: 'product_total_profit', label: 'Profit', format: 'currency' as const },
  { key: 'product_profit_margin', label: 'Margin', format: 'percent' as const },
];

const selectClass = 'rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500';

export default function ProductStatsPage() {
  const [country, setCountry] = useState('');
  const [platform, setPlatform] = useState('');
  const [granularity, setGranularity] = useState<'month' | 'day'>('month');
  const [showByPlatform, setShowByPlatform] = useState(false);
  const [chartProductId, setChartProductId] = useState<number | undefined>(undefined);

  const countryParam = country || undefined;
  const platformParam = platform || undefined;

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const { data: stats = [] } = useQuery({
    queryKey: ['product-stats', countryParam],
    queryFn: () => getProductStats(countryParam),
  });

  const { data: byPlatform = [] } = useQuery({
    queryKey: ['product-by-platform-stats', platformParam, countryParam],
    queryFn: () => getProductByPlatformStats(platformParam, countryParam),
    enabled: showByPlatform,
  });

  const { data: timeSeries = [] } = useQuery({
    queryKey: ['product-time', granularity, chartProductId, countryParam],
    queryFn: () => granularity === 'month' ? getProductMonth(chartProductId, countryParam) : getProductDay(chartProductId, countryParam),
  });

  const selectedProductName = chartProductId
    ? products.find((p) => p.productId === chartProductId)?.productName ?? 'Product'
    : 'All Products';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Product Stats</h1>
        <StatsFilters
          country={country}
          onCountryChange={setCountry}
          platform={platform}
          onPlatformChange={setPlatform}
          showPlatform={showByPlatform}
        />
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowByPlatform(false)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            !showByPlatform ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          All Products
        </button>
        <button
          onClick={() => setShowByPlatform(true)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            showByPlatform ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          By Platform
        </button>
      </div>

      <div className="mb-6">
        <StatsTable
          data={showByPlatform ? byPlatform : stats}
          columns={showByPlatform ? productByPlatformColumns : productColumns}
        />
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setGranularity('month')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              granularity === 'month' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setGranularity('day')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              granularity === 'day' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Daily
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Product:</label>
          <select
            value={chartProductId ?? ''}
            onChange={(e) => setChartProductId(e.target.value ? Number(e.target.value) : undefined)}
            className={selectClass}
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.productId} value={p.productId}>{p.productName}</option>
            ))}
          </select>
        </div>
      </div>

      <TimeSeriesChart
        data={timeSeries}
        xKey={granularity === 'month' ? 'month' : 'day'}
        title={`${selectedProductName} — ${granularity === 'month' ? 'Monthly' : 'Daily'} Trends`}
        granularity={granularity}
        lines={[
          { dataKey: granularity === 'month' ? 'month_revenue' : 'day_revenue', color: '#f59e0b', name: 'Revenue' },
          { dataKey: granularity === 'month' ? 'month_profit' : 'day_profit', color: '#10b981', name: 'Profit' },
          { dataKey: granularity === 'month' ? 'month_cost' : 'day_cost', color: '#6b7280', name: 'Cost' },
        ]}
      />
    </div>
  );
}
