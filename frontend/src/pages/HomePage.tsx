/**
 * Home page showing:
 * - Best-selling products table (top 5 by units sold)
 * - All-time monthly revenue/profit/cost overview chart
 */
import { useQuery } from '@tanstack/react-query';
import { getProductStats, getOverallMonth } from '../api/stats';
import TimeSeriesChart from '../components/stats/TimeSeriesChart';

export default function HomePage() {
  const { data: productStats = [] } = useQuery({
    queryKey: ['product-stats'],
    queryFn: () => getProductStats(),
  });

  const { data: overallMonth = [] } = useQuery({
    queryKey: ['overall-month'],
    queryFn: getOverallMonth,
  });

  const bestSellers = [...productStats]
    .sort((a, b) => (Number(b.units_sold) || 0) - (Number(a.units_sold) || 0))
    .slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Home</h1>

      {bestSellers.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Best Selling Products</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">#</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Product</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Units Sold</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Revenue</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Profit</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Margin</th>
              </tr>
            </thead>
            <tbody>
              {bestSellers.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 text-gray-700">{String(row.product_name)}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{Number(row.units_sold).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-900">${Number(row.product_total_revenue).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-900">${Number(row.product_total_profit).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{(Number(row.product_profit_margin) * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TimeSeriesChart
        data={overallMonth}
        xKey="month"
        title="All-Time Monthly Overview"
        granularity="month"
        lines={[
          { dataKey: 'month_revenue', color: '#f59e0b', name: 'Revenue' },
          { dataKey: 'month_profit', color: '#10b981', name: 'Profit' },
          { dataKey: 'month_cost', color: '#6b7280', name: 'Cost' },
        ]}
      />
    </div>
  );
}
