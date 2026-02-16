/**
 * Form for creating or editing a product.
 * Pre-fills fields when editing an existing product via the `product` prop.
 */
import { useState, useEffect } from 'react';
import type { Product } from '../../types';

interface Props {
  product?: Product | null;
  onSubmit: (data: Omit<Product, 'productId'>) => void;
  onCancel: () => void;
}

export default function ProductForm({ product, onSubmit, onCancel }: Props) {
  const [productName, setProductName] = useState('');
  const [productType, setProductType] = useState('');
  const [cost, setCost] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');

  useEffect(() => {
    if (product) {
      setProductName(product.productName);
      setProductType(product.productType || '');
      setCost(String(product.cost));
      setStockQuantity(String(product.stockQuantity));
    }
  }, [product]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      productName,
      productType: productType || null,
      cost: parseFloat(cost),
      stockQuantity: parseInt(stockQuantity, 10),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {product ? 'Edit Product' : 'New Product'}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
          <input
            type="text"
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost (CNY)</label>
          <input
            type="number"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
          <input
            type="number"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-md hover:bg-amber-600 transition-colors"
        >
          {product ? 'Update' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
