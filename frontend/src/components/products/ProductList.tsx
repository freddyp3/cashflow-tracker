import type { Product } from '../../types';

/**
 * Displays all products in a table with columns for ID, name, type, cost (CNY), and stock.
 * Each row has Edit and Delete action buttons.
 */

interface Props {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

export default function ProductList({ products, onEdit, onDelete }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 font-medium text-gray-500">ID</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500">Cost (CNY)</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500">Stock</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.productId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-500">{p.productId}</td>
              <td className="px-4 py-3 font-medium text-gray-900">{p.productName}</td>
              <td className="px-4 py-3 text-gray-600">{p.productType || '—'}</td>
              <td className="px-4 py-3 text-right text-gray-900">¥{p.cost.toFixed(2)}</td>
              <td className="px-4 py-3 text-right text-gray-600">{p.stockQuantity}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onEdit(p)}
                  className="text-amber-600 hover:text-amber-700 font-medium mr-3"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(p.productId)}
                  className="text-red-500 hover:text-red-600 font-medium"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No products yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
