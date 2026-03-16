/**
 * Form for creating or editing an order with its line items.
 * Supports multi-currency input (CAD, USD, EUR, GBP, CNY, AUD, CHF) with
 * live exchange rate conversion to CAD via the CurrencyService API.
 * Dynamically adds/removes OrderItemRow sub-forms for line items.
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../../api/products';
import { getRate } from '../../api/currency';
import type { Order, OrderRequest } from '../../types';
import OrderItemRow, { type ItemData } from './OrderItemRow';

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'CNY', 'AUD', 'CHF'];

interface Props {
  order?: Order | null;
  onSubmit: (data: OrderRequest) => void;
  onCancel: () => void;
}

const emptyItem = (): ItemData => ({
  productId: 0,
  itemPaid: '',
  itemSize: '',
  note: '',
});

export default function OrderForm({ order, onSubmit, onCancel }: Props) {
  const [currency, setCurrency] = useState('CAD');
  const [rate, setRate] = useState(1);
  const [cnyRate, setCnyRate] = useState(1);
  const [platform, setPlatform] = useState('');
  const [shipping, setShipping] = useState('');
  const [revenue, setRevenue] = useState('');
  const [refunded, setRefunded] = useState('0');
  const [refundedUsed, setRefundedUsed] = useState('0');
  const [customerName, setCustomerName] = useState('');
  const [shippingLocation, setShippingLocation] = useState('');
  const [disputed, setDisputed] = useState(false);
  const [draft, setDraft] = useState(false);
  const [orderDate, setOrderDate] = useState('');

  const [note, setNote] = useState('');
  const [items, setItems] = useState<ItemData[]>([emptyItem()]);

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  useEffect(() => {
    if (order) {
      setPlatform(order.platform);
      setShipping(String(order.shipping));
      setRevenue(String(order.revenue));
      setRefunded(String(order.refunded));
      setRefundedUsed(String(order.refundedUsed));
      setCustomerName(order.customerName);
      setShippingLocation(order.shippingLocation);
      setDisputed(order.disputed);
      setDraft(order.draft);
      setOrderDate(order.orderDate || '');

      setNote(order.note || '');
      setItems(
        order.items.map((i) => ({
          productId: i.productId,
          itemPaid: String(i.itemPaid),
          itemSize: i.itemSize || '',
          note: i.note || '',
        }))
      );
    }
  }, [order]);

  useEffect(() => {
    if (currency === 'CAD') {
      setRate(1);
      return;
    }
    getRate(currency).then(setRate);
  }, [currency]);

  useEffect(() => {
    getRate('CNY').then(setCnyRate);
  }, []);

  function handleItemChange(index: number, field: keyof ItemData, value: string) {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: field === 'productId' ? parseInt(value, 10) || 0 : value };
      return copy;
    });
  }

  function convert(val: string): number {
    const num = parseFloat(val) || 0;
    return parseFloat((num * rate).toFixed(2));
  }

  function convertCny(val: string): number {
    const num = parseFloat(val) || 0;
    return parseFloat((num * cnyRate).toFixed(2));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      platform,
      shipping: convert(shipping),
      revenue: convert(revenue),
      refunded: convertCny(refunded),
      refundedUsed: convertCny(refundedUsed),
      customerName: customerName || 'TBD',
      shippingLocation: shippingLocation || 'TBD',
      disputed,
      draft,
      orderDate: orderDate || null,
      deliveredDate: null,
      note: note || null,
      items: items
        .filter((i) => i.productId > 0)
        .map((i) => ({
          productId: i.productId,
          itemPaid: convert(i.itemPaid),
          itemSize: i.itemSize || null,
          note: i.note || null,
        })),
    });
  }

  const inputClass =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500';

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {order ? 'Edit Order' : 'New Order'}
        </h3>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Currency:</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {currency !== 'CAD' && (
            <span className="text-xs text-gray-400">1 {currency} = {rate.toFixed(4)} CAD</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
          <input type="text" value={platform} onChange={(e) => setPlatform(e.target.value)} required={!draft} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shipping ({currency})</label>
          <input type="number" step="0.01" value={shipping} onChange={(e) => setShipping(e.target.value)} className={inputClass} />
          {currency !== 'CAD' && shipping && <p className="text-xs text-gray-400 mt-1">= ${convert(shipping)} CAD</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Revenue ({currency})</label>
          <input type="number" step="0.01" value={revenue} onChange={(e) => setRevenue(e.target.value)} className={inputClass} />
          {currency !== 'CAD' && revenue && <p className="text-xs text-gray-400 mt-1">= ${convert(revenue)} CAD</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Refunded (CNY)</label>
          <input type="number" step="0.01" value={refunded} onChange={(e) => setRefunded(e.target.value)} className={inputClass} />
          {refunded && refunded !== '0' && <p className="text-xs text-gray-400 mt-1">= ${convertCny(refunded)} CAD</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Refunded Used (CNY)</label>
          <input type="number" step="0.01" value={refundedUsed} onChange={(e) => setRefundedUsed(e.target.value)} className={inputClass} />
          {refundedUsed && refundedUsed !== '0' && <p className="text-xs text-gray-400 mt-1">= ${convertCny(refundedUsed)} CAD</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
          <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Location</label>
          <input type="text" value={shippingLocation} onChange={(e) => setShippingLocation(e.target.value)} placeholder="City, State, COUNTRY" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
          <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
        </div>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} className="rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
            Draft
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={disputed} onChange={(e) => setDisputed(e.target.checked)} className="rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
            Disputed
          </label>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">Order Items</h4>
          <button
            type="button"
            onClick={() => setItems([...items, emptyItem()])}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            + Add Item
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <OrderItemRow
              key={i}
              item={item}
              index={i}
              products={products}
              rate={rate}
              currency={currency}
              onChange={handleItemChange}
              onRemove={(idx) => setItems(items.filter((_, j) => j !== idx))}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-md hover:bg-amber-600 transition-colors"
        >
          {draft ? 'Save Draft' : order ? 'Update' : 'Create'}
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
