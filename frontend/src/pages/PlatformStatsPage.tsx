/**
 * Platform analytics page showing:
 * - Stats table with revenue, cost, profit, margins, and refund data per sales platform
 * - Time-series line chart (monthly or daily granularity) for revenue/profit/cost trends
 * - Platform selector to filter the chart by a specific platform
 * - Country filter dropdown
 *
 * Data comes from PostgreSQL views: vw_platform_stats, vw_platform_month, and vw_platform_day.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPlatformStats, getPlatformMonth, getPlatformDay } from '../api/stats';
import { getPlatforms } from '../api/meta';
import StatsFilters from '../components/stats/StatsFilters';
import StatsTable from '../components/stats/StatsTable';
import TimeSeriesChart from '../components/stats/TimeSeriesChart';

const platformColumns = [
  { key: 'platform', label: 'Platform' },
  { key: 'units_sold', label: 'Units', format: 'number' as const },
  { key: 'platform_revenue', label: 'Revenue', format: 'currency' as const },
  { key: 'platform_total_cost', label: 'Cost', format: 'currency' as const },
  { key: 'platform_profit', label: 'Profit', format: 'currency' as const },
  { key: 'platform_profit_margin', label: 'Margin', format: 'percent' as const },
  { key: 'avg_platform_revenue', label: 'Avg Revenue', format: 'currency' as const },
  { key: 'avg_platform_profit', label: 'Avg Profit', format: 'currency' as const },
  { key: 'platform_refunded', label: 'Refunded', format: 'cny' as const },
  { key: 'platform_net_refund', label: 'Net Refund', format: 'cny' as const },
];

const selectClass = 'rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500';

export default function PlatformStatsPage() {
  const [country, setCountry] = useState('');
  const [granularity, setGranularity] = useState<'month' | 'day'>('month');
  const [chartPlatform, setChartPlatform] = useState('');

  const countryParam = country || undefined;
  const platformParam = chartPlatform || undefined;

  const { data: platforms = [] } = useQuery({
    queryKey: ['meta-platforms'],
    queryFn: getPlatforms,
  });

  const { data: stats = [] } = useQuery({
    queryKey: ['platform-stats', countryParam],
    queryFn: () => getPlatformStats(countryParam),
  });

  const { data: timeSeries = [] } = useQuery({
    queryKey: ['platform-time', granularity, platformParam, countryParam],
    queryFn: () => granularity === 'month' ? getPlatformMonth(platformParam, countryParam) : getPlatformDay(platformParam, countryParam),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Platform Stats</h1>
        <StatsFilters country={country} onCountryChange={setCountry} />
      </div>

      <div className="mb-6">
        <StatsTable data={stats} columns={platformColumns} />
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
          <label className="text-sm font-medium text-gray-600">Platform:</label>
          <select
            value={chartPlatform}
            onChange={(e) => setChartPlatform(e.target.value)}
            className={selectClass}
          >
            <option value="">All Platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <TimeSeriesChart
        data={timeSeries}
        xKey={granularity === 'month' ? 'month' : 'day'}
        title={`${chartPlatform || 'All Platforms'} — ${granularity === 'month' ? 'Monthly' : 'Daily'} Trends`}
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
