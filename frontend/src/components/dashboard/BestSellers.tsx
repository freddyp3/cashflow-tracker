/** Top-5 products by units sold. */
import { EmptyState, ErrorState, TableSkeleton, formatMoney } from '../ui';
import type { Row } from '../../api/stats';

interface Props {
  rows: Row[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

export default function BestSellers({ rows, loading, error, onRetry }: Props) {
  const bestSellers = [...rows]
    .sort((a, b) => (Number(b.units_sold) || 0) - (Number(a.units_sold) || 0))
    .slice(0, 5);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">Best Selling Products</h2>
      </div>
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : error ? (
        <ErrorState onRetry={onRetry} />
      ) : bestSellers.length === 0 ? (
        <EmptyState title="No sales yet" />
      ) : (
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
                <td className="px-4 py-3 text-right text-gray-900">{formatMoney(Number(row.product_total_revenue))}</td>
                <td className="px-4 py-3 text-right text-gray-900">{formatMoney(Number(row.product_total_profit))}</td>
                <td className="px-4 py-3 text-right text-gray-900">{(Number(row.product_profit_margin) * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
