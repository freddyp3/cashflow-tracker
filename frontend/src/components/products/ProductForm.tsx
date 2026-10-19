/**
 * Form for creating or editing a product, rendered inside the page's Drawer.
 * Pre-fills fields when editing via the `product` prop; validates inline on
 * submit (the drawer's footer button targets this form via form="product-form").
 */
import { useState } from 'react';
import type { Product } from '../../types';
import { formatMoney, inputClass, labelClass, errorClass } from '../ui';

interface Props {
  product?: Product | null;
  cnyRate?: number;
  onSubmit: (data: Omit<Product, 'productId'>) => void;
}

export default function ProductForm({ product, cnyRate, onSubmit }: Props) {
  const [productName, setProductName] = useState(product?.productName ?? '');
  const [productType, setProductType] = useState(product?.productType ?? '');
  const [cost, setCost] = useState(product ? String(product.cost) : '');
  const [stockQuantity, setStockQuantity] = useState(product ? String(product.stockQuantity) : '0');
  const [errors, setErrors] = useState<{ name?: string; cost?: string; stock?: string }>({});

  const parsedCost = Number(cost);
  const parsedStock = Number(stockQuantity);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!productName.trim()) next.name = 'Product name is required';
    if (cost.trim() === '' || Number.isNaN(parsedCost)) next.cost = 'Cost is required';
    else if (parsedCost < 0) next.cost = 'Cost must be 0 or more';
    if (stockQuantity.trim() === '' || Number.isNaN(parsedStock) || !Number.isInteger(parsedStock) || parsedStock < 0)
      next.stock = 'Stock must be 0 or more';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit({
      productName: productName.trim(),
      productType: productType || null,
      cost: parsedCost,
      stockQuantity: parsedStock,
    });
  }

  return (
    <form id="product-form" noValidate onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="product-name" className={labelClass}>Product name</label>
        <input
          id="product-name"
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'product-name-error' : undefined}
          className={inputClass}
        />
        {errors.name && <p id="product-name-error" className={errorClass}>{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="product-type" className={labelClass}>Type</label>
        <input
          id="product-type"
          type="text"
          value={productType}
          onChange={(e) => setProductType(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="product-cost" className={labelClass}>Cost (CN¥)</label>
        <input
          id="product-cost"
          type="number"
          step="0.01"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          aria-invalid={!!errors.cost}
          aria-describedby={errors.cost ? 'product-cost-error' : undefined}
          className={inputClass}
        />
        {errors.cost
          ? <p id="product-cost-error" className={errorClass}>{errors.cost}</p>
          : cnyRate !== undefined && cost !== '' && !Number.isNaN(parsedCost) && (
            <p className="text-xs text-gray-400 mt-1">≈ {formatMoney(parsedCost * cnyRate)}</p>
          )}
      </div>
      <div>
        <label htmlFor="product-stock" className={labelClass}>Stock</label>
        <input
          id="product-stock"
          type="number"
          value={stockQuantity}
          onChange={(e) => setStockQuantity(e.target.value)}
          aria-invalid={!!errors.stock}
          aria-describedby={errors.stock ? 'product-stock-error' : undefined}
          className={inputClass}
        />
        {errors.stock && <p id="product-stock-error" className={errorClass}>{errors.stock}</p>}
      </div>
    </form>
  );
}
