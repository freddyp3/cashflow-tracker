/** The five most recent orders (by orderDate desc, nulls last, orderId desc tiebreak). */
import { Link } from 'react-router-dom';
import type { Order } from '../../types';
import { Badge, EmptyState, ErrorState, Money, Skeleton } from '../ui';
import { applyTable, DEFAULT_STATE } from '../orders/useOrderTable';

interface Props {
  orders: Order[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

export default function RecentOrders({ orders, loading, error, onRetry }: Props) {
  const recent = applyTable(orders, DEFAULT_STATE).slice(0, 5);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Recent Orders</h2>
        <Link to="/orders" className="text-sm text-amber-600 hover:text-amber-700">
          View all
        </Link>
      </div>
      {loading ? (
        <div className="p-4">
          <Skeleton className="h-16" />
        </div>
      ) : error ? (
        <ErrorState onRetry={onRetry} />
      ) : recent.length === 0 ? (
        <EmptyState title="No orders yet" />
      ) : (
        <ul className="divide-y divide-gray-100">
          {recent.map((order) => (
            <li key={order.orderId} className="px-4 py-3">
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  <Badge tone="gray">{order.platform}</Badge>
                  {order.draft && <Badge tone="amber">DRAFT</Badge>}
                  <span className="text-sm text-gray-900">{order.customerName}</span>
                </div>
                <Money amount={order.revenue} />
              </div>
              <div className="text-xs text-gray-500">
                {order.orderDate ?? '—'} · {order.shippingLocation}
              </div>
              {order.items.length > 0 && (
                <div className="text-xs text-gray-600 mt-1">
                  {order.items
                    .map((item) => `${item.productName ?? ''}${item.itemSize ? ` (${item.itemSize})` : ''}`)
                    .join(', ')}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
