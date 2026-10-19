import type { Product } from '../../types';
import { inputClass, smallLabelClass } from '../ui';

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
        <label htmlFor={`item-${index}-product`} className={smallLabelClass}>Product</label>
        <select
          id={`item-${index}-product`}
          value={item.productId}
          onChange={(e) => onChange(index, 'productId', e.target.value)}
          className={inputClass}
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
        <label htmlFor={`item-${index}-paid`} className={smallLabelClass}>
          Item Paid ({currency})
        </label>
        <input
          id={`item-${index}-paid`}
          type="number"
          step="0.01"
          value={item.itemPaid}
          onChange={(e) => onChange(index, 'itemPaid', e.target.value)}
          className={inputClass}
        />
        {converted && (
          <p className="text-xs text-gray-400 mt-1">= ${converted} CAD</p>
        )}
      </div>
      <div className="w-24">
        <label htmlFor={`item-${index}-size`} className={smallLabelClass}>Size</label>
        <input
          id={`item-${index}-size`}
          type="text"
          value={item.itemSize}
          onChange={(e) => onChange(index, 'itemSize', e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="w-32">
        <label htmlFor={`item-${index}-note`} className={smallLabelClass}>Note</label>
        <input
          id={`item-${index}-note`}
          type="text"
          value={item.note}
          onChange={(e) => onChange(index, 'note', e.target.value)}
          className={inputClass}
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
