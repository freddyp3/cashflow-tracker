/**
 * Home dashboard:
 * - KPI row (all-time revenue/profit/margin/units with deltas vs last month)
 * - Monthly revenue & profit chart
 * - Shipping globe at 320px linking to the full map
 * - Best sellers (top 5 by units) and the 5 most recent orders
 */
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPlatformStats, getProductStats, getOverallMonth } from '../api/stats';
import { getOrders } from '../api/orders';
import TimeSeriesChart from '../components/stats/TimeSeriesChart';
import ShippingGlobe from '../components/globe/ShippingGlobe';
import KpiRow from '../components/dashboard/KpiRow';
import BestSellers from '../components/dashboard/BestSellers';
import RecentOrders from '../components/dashboard/RecentOrders';
import { computeKpis } from '../components/dashboard/kpi';

export default function HomePage() {
  const platformStatsQuery = useQuery({
    queryKey: ['platform-stats', undefined],
    queryFn: () => getPlatformStats(),
  });

  const overallMonthQuery = useQuery({
    queryKey: ['overall-month'],
    queryFn: getOverallMonth,
  });

  const productStatsQuery = useQuery({
    queryKey: ['product-stats', undefined],
    queryFn: () => getProductStats(),
  });

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: () => getOrders(),
  });

  const kpis =
    platformStatsQuery.data && overallMonthQuery.data
      ? computeKpis(platformStatsQuery.data, overallMonthQuery.data)
      : undefined;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Home</h1>

      <div className="mb-6">
        <KpiRow kpis={kpis} loading={platformStatsQuery.isLoading || overallMonthQuery.isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <TimeSeriesChart
          data={overallMonthQuery.data ?? []}
          xKey="month"
          title="Revenue & Profit — Monthly"
          granularity="month"
          series={['revenue', 'profit']}
          lines={[
            { dataKey: 'month_revenue', color: '#f59e0b', name: 'Revenue' },
            { dataKey: 'month_profit', color: '#10b981', name: 'Profit' },
            { dataKey: 'month_cost', color: '#6b7280', name: 'Cost' },
          ]}
        />
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Shipping map</h2>
            <Link to="/visualization/globe" className="text-sm text-amber-600 hover:text-amber-700">
              View all
            </Link>
          </div>
          <div className="flex justify-center">
            <ShippingGlobe size={320} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        <BestSellers
          rows={productStatsQuery.data ?? []}
          loading={productStatsQuery.isLoading}
          error={productStatsQuery.isError}
          onRetry={() => productStatsQuery.refetch()}
        />
        <RecentOrders
          orders={ordersQuery.data ?? []}
          loading={ordersQuery.isLoading}
          error={ordersQuery.isError}
          onRetry={() => ordersQuery.refetch()}
        />
      </div>
    </div>
  );
}
