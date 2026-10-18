import { Fragment } from 'react';
import type { Order } from '../../types';
import { Badge, Button, Money } from '../ui';
import type { SortDir, SortKey } from './useOrderTable';

/**
 * Orders data table: sortable columns, expandable item rows, Money formatting,
 * status badges, and per-row Edit/Delete actions.
 */

interface Props {
  orders: Order[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
  expandedId: number | null;
  onToggleExpand: (id: number) => void;
}

interface Column {
  key: SortKey | null;
  label: string;
  align: 'left' | 'right' | 'center';
}

const COLUMNS: Column[] = [
  { key: null, label: '', align: 'left' },
  { key: null, label: 'ID', align: 'left' },
  { key: 'platform', label: 'Platform', align: 'left' },
  { key: 'customerName', label: 'Customer', align: 'left' },
  { key: null, label: 'Location', align: 'left' },
  { key: 'revenue', label: 'Revenue', align: 'right' },
  { key: 'shipping', label: 'Shipping', align: 'right' },
  { key: 'refunded', label: 'Refunded (CN¥)', align: 'right' },
  { key: 'orderDate', label: 'Date', align: 'left' },
  { key: null, label: 'Items', align: 'center' },
  { key: null, label: 'Actions', align: 'right' },
];

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' };

export default function OrderList({
  orders,
  sortKey,
  sortDir,
  onSort,
  onEdit,
  onDelete,
  expandedId,
  onToggleExpand,
}: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {COLUMNS.map((col, i) => (
              <th
                key={i}
                aria-sort={col.key ? (col.key === sortKey ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                className={`px-4 py-3 font-medium text-gray-500 ${alignClass[col.align]}`}
              >
                {col.key ? (
                  <button
                    type="button"
                    onClick={() => onSort(col.key!)}
                    className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-900"
                  >
                    {col.label}
                    {col.key === sortKey && (
                      <span aria-hidden>{sortDir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </button>
                ) : (
                  col.label || <span className="sr-only">Items</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const expanded = expandedId === o.orderId;
            return (
              <Fragment key={o.orderId}>
                <tr className={`border-b border-gray-100 hover:bg-gray-50 ${o.draft ? 'opacity-60' : ''}`}>
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-label="Show items"
                      onClick={() => onToggleExpand(o.orderId)}
                      className="p-1 text-gray-400 hover:text-gray-700"
                    >
                      <span aria-hidden className="inline-block transition-transform">{expanded ? '▾' : '▸'}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {o.orderId}
                    {o.draft && <Badge tone="amber" className="ml-2">DRAFT</Badge>}
                    {o.disputed && <Badge tone="red" className="ml-2">DISPUTED</Badge>}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{o.platform}</td>
                  <td className="px-4 py-3 text-gray-600">{o.customerName}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{o.shippingLocation}</td>
                  <td className="px-4 py-3 text-right text-gray-900"><Money amount={o.revenue} /></td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {o.shipping === -1 ? '—' : <Money amount={o.shipping} />}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600"><Money amount={o.refunded} currency="CNY" /></td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{o.orderDate || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{o.items.length}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(o)} className="mr-3 text-amber-600 hover:text-amber-700">
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => onDelete(o)}>
                      Delete
                    </Button>
                  </td>
                </tr>
                {expanded && (
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <td />
                    <td colSpan={10} className="px-4 py-3">
                      {o.items.length === 0 ? (
                        <p className="text-sm text-gray-400">No items</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-gray-500">
                              <th className="py-1 pr-4 font-medium">Product</th>
                              <th className="py-1 pr-4 font-medium">Size</th>
                              <th className="py-1 pr-4 font-medium text-right">Paid</th>
                              <th className="py-1 font-medium">Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {o.items.map((item) => (
                              <tr key={item.orderItemId ?? `${item.productId}-${item.itemSize}`} className="text-gray-600">
                                <td className="py-1 pr-4">{item.productName ?? `#${item.productId}`}</td>
                                <td className="py-1 pr-4">{item.itemSize ?? '—'}</td>
                                <td className="py-1 pr-4 text-right"><Money amount={item.itemPaid} /></td>
                                <td className="py-1">{item.note ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
