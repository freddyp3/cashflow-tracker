import type { Product } from '../../types';

/**
 * A single line item row within the OrderForm.
 * Renders product dropdown, item paid input (with currency conversion preview),
 * size input, note input, and a remove button.
 */

interface ItemData {
  productId: number;
  itemPaid: string;
  itemSize: string;
  note: string;
}

interface Props {
  item: ItemData;
  index: number;
  products: Product[];
  rate: number;
  currency: string;
  onChange: (index: number, field: keyof ItemData, value: string) => void;
  onRemove: (index: number) => void;
}

export default function OrderItemRow({ item, index, products, rate, currency, onChange, onRemove }: Props) {
  const paid = parseFloat(item.itemPaid) || 0;
  const converted = currency !== 'CAD' ? (paid * rate).toFixed(2) : null;

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-md">
      <div className="flex-1">
        <label htmlFor={`item-${index}-product`} className="block text-xs font-medium text-gray-500 mb-1">Product</label>
        <select
          id={`item-${index}-product`}
          value={item.productId}
          onChange={(e) => onChange(index, 'productId', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        >
          <option value={0}>Select product...</option>
          {products.map((p) => (
            <option key={p.productId} value={p.productId}>
              {p.productName}
            </option>
          ))}
        </select>
      </div>
      <div className="w-32">
        <label htmlFor={`item-${index}-paid`} className="block text-xs font-medium text-gray-500 mb-1">
          Item Paid ({currency})
        </label>
        <input
          id={`item-${index}-paid`}
          type="number"
          step="0.01"
          value={item.itemPaid}
          onChange={(e) => onChange(index, 'itemPaid', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
        {converted && (
          <p className="text-xs text-gray-400 mt-1">= ${converted} CAD</p>
        )}
      </div>
      <div className="w-24">
        <label htmlFor={`item-${index}-size`} className="block text-xs font-medium text-gray-500 mb-1">Size</label>
        <input
          id={`item-${index}-size`}
          type="text"
          value={item.itemSize}
          onChange={(e) => onChange(index, 'itemSize', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
      </div>
      <div className="w-32">
        <label htmlFor={`item-${index}-note`} className="block text-xs font-medium text-gray-500 mb-1">Note</label>
        <input
          id={`item-${index}-note`}
          type="text"
          value={item.note}
          onChange={(e) => onChange(index, 'note', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="mt-5 text-red-400 hover:text-red-600 text-sm font-medium"
      >
        Remove
      </button>
    </div>
  );
}

export type { ItemData };
