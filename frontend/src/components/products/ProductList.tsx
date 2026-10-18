/**
 * Displays all products in a table with columns for ID, name, type, cost
 * (CN¥ + ≈ CA$ when a rate is provided), and stock (with a low-stock badge).
 * Names link to the Insights page filtered to that product.
 */
import { Link } from 'react-router-dom';
import type { Product } from '../../types';
import { Badge, Button, Money, formatMoney } from '../ui';

interface Props {
  products: Product[];
  cnyRate: number | undefined;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export default function ProductList({ products, cnyRate, onEdit, onDelete }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 font-medium text-gray-500">ID</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500">Cost (CN¥)</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500">Stock</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.productId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-500">{p.productId}</td>
              <td className="px-4 py-3">
                <Link
                  to={`/insights?tab=products&product=${p.productId}`}
                  className="font-medium text-gray-900 hover:text-amber-700"
                >
                  {p.productName}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-600">{p.productType || '—'}</td>
              <td className="px-4 py-3 text-right text-gray-900">
                <Money amount={p.cost} currency="CNY" />
                {cnyRate !== undefined && (
                  <span className="ml-2 text-xs text-gray-400">≈ {formatMoney(p.cost * cnyRate)}</span>
                )}
              </td>
              <td className="px-4 py-3 text-right text-gray-600">
                {p.stockQuantity}
                {p.stockQuantity <= 1 && <Badge tone="red" className="ml-2">Low stock</Badge>}
              </td>
              <td className="px-4 py-3 text-right">
                <Button variant="ghost" size="sm" onClick={() => onEdit(p)}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" className="ml-2" onClick={() => onDelete(p)}>
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
