import type { Order } from '../../types';

/**
 * Displays all orders in a table with platform, customer, location, revenue,
 * shipping, refunded, date, item count, and action buttons.
 */

interface Props {
  orders: Order[];
  onEdit: (order: Order) => void;
  onDelete: (id: number) => void;
}

export default function OrderList({ orders, onEdit, onDelete }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 font-medium text-gray-500">ID</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Platform</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Customer</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Location</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500">Revenue</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500">Shipping</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500">Refunded (CNY)</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
            <th className="text-center px-4 py-3 font-medium text-gray-500">Items</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.orderId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-500">{o.orderId}</td>
              <td className="px-4 py-3 font-medium text-gray-900">{o.platform}</td>
              <td className="px-4 py-3 text-gray-600">{o.customerName}</td>
              <td className="px-4 py-3 text-gray-600 text-xs">{o.shippingLocation}</td>
              <td className="px-4 py-3 text-right text-gray-900">${o.revenue.toFixed(2)}</td>
              <td className="px-4 py-3 text-right text-gray-600">${o.shipping.toFixed(2)}</td>
              <td className="px-4 py-3 text-right text-gray-600">¥{o.refunded.toFixed(2)}</td>
              <td className="px-4 py-3 text-gray-600">{o.orderDate || '—'}</td>
              <td className="px-4 py-3 text-center text-gray-500">{o.items.length}</td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => onEdit(o)} className="text-amber-600 hover:text-amber-700 font-medium mr-3">
                  Edit
                </button>
                <button onClick={() => onDelete(o.orderId)} className="text-red-500 hover:text-red-600 font-medium">
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                No orders yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
