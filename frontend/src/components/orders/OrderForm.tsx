/**
 * Drawer form for creating or editing an order, organised into Sale /
 * Customer & shipping / Status / Items sections. Location is captured as a
 * country select + city + region and saved as "City, Region, CODE".
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../../api/products';
import { getRate } from '../../api/currency';
import type { Order, OrderRequest } from '../../types';
import { COUNTRIES, countryByCode } from '../../data/countries';
import { formatMoney, inputClass, labelClass, errorClass } from '../ui';
import OrderItemRow, { type ItemData } from './OrderItemRow';
import { formatLocation, parseLocation } from './location';

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'CNY', 'AUD', 'CHF'];

interface Props {
  order?: Order | null;
  platforms: string[];
  onSubmit: (data: OrderRequest) => void;
  onDraftChange?: (draft: boolean) => void;
}

interface FieldErrors {
  platform?: string;
  revenue?: string;
}

const emptyItem = (): ItemData => ({
  productId: 0,
  itemPaid: '',
  itemSize: '',
  note: '',
});

export default function OrderForm({ order, platforms, onSubmit, onDraftChange }: Props) {
  const initialLocation = parseLocation(order?.shippingLocation);
  const [currency, setCurrency] = useState('CAD');
  const [rate, setRate] = useState(1);
  const [cnyRate, setCnyRate] = useState(1);
  const [platform, setPlatform] = useState(order?.platform ?? '');
  const [shipping, setShipping] = useState(order ? String(order.shipping) : '');
  const [revenue, setRevenue] = useState(order ? String(order.revenue) : '');
  const [refunded, setRefunded] = useState(order ? String(order.refunded) : '0');
  const [refundedUsed, setRefundedUsed] = useState(order ? String(order.refundedUsed) : '0');
  const [customerName, setCustomerName] = useState(order?.customerName ?? '');
  const [country, setCountry] = useState(initialLocation.country);
  const [city, setCity] = useState(initialLocation.city);
  const [region, setRegion] = useState(initialLocation.region);
  const [disputed, setDisputed] = useState(order?.disputed ?? false);
  const [draft, setDraft] = useState(order?.draft ?? false);
  const [orderDate, setOrderDate] = useState(order?.orderDate || new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(order?.note ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [items, setItems] = useState<ItemData[]>(
    order
      ? order.items.map((i) => ({
          productId: i.productId,
          itemPaid: String(i.itemPaid),
          itemSize: i.itemSize || '',
          note: i.note || '',
        }))
      : [emptyItem()]
  );

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  useEffect(() => {
    if (currency !== 'CAD') getRate(currency).then(setRate);
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
    const effectiveRate = currency === 'CAD' ? 1 : rate;
    const num = parseFloat(val) || 0;
    return parseFloat((num * effectiveRate).toFixed(2));
  }

  function convertCny(val: string): number {
    const num = parseFloat(val) || 0;
    return parseFloat((num * cnyRate).toFixed(2));
  }

  function updateDraft(value: boolean) {
    setDraft(value);
    onDraftChange?.(value);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: FieldErrors = {};
    if (!draft) {
      if (!platform) next.platform = 'Platform is required';
      if (revenue.trim() === '' || parseFloat(revenue) < 0) next.revenue = 'Revenue is required';
    }
    setErrors(next);
    if (next.platform || next.revenue) return;

    onSubmit({
      platform,
      shipping: shipping === '' ? -1 : convert(shipping),
      revenue: convert(revenue),
      refunded: convertCny(refunded),
      refundedUsed: convertCny(refundedUsed),
      customerName: customerName || 'TBD',
      shippingLocation: formatLocation({ city, region, country }),
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

  return (
    <form id="order-form" noValidate onSubmit={handleSubmit} className="space-y-6">
      <fieldset>
        <legend className="text-sm font-semibold text-gray-900 mb-3">Sale</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="of-platform" className={labelClass}>Platform</label>
            <select
              id="of-platform"
              aria-label="Platform"
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value);
                setErrors((p) => ({ ...p, platform: undefined }));
              }}
              aria-invalid={Boolean(errors.platform)}
              aria-describedby={errors.platform ? 'of-platform-error' : undefined}
              className={`${inputClass} ${errors.platform ? 'border-red-500' : ''}`}
            >
              <option value="">Select platform…</option>
              {platforms.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              {platform && !platforms.includes(platform) && (
                <option value={platform}>{platform}</option>
              )}
            </select>
            {errors.platform && <p id="of-platform-error" className={errorClass}>{errors.platform}</p>}
          </div>
          <div>
            <label htmlFor="of-order-date" className={labelClass}>Order date</label>
            <input id="of-order-date" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="of-currency" className={labelClass}>Currency</label>
            <select id="of-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {currency !== 'CAD' && (
              <p className="text-xs text-gray-400 mt-1">1 {currency} = {rate.toFixed(4)} CAD</p>
            )}
          </div>
          <div>
            <label htmlFor="of-revenue" className={labelClass}>Revenue ({currency})</label>
            <input
              id="of-revenue"
              type="number"
              step="0.01"
              value={revenue}
              onChange={(e) => {
                setRevenue(e.target.value);
                setErrors((p) => ({ ...p, revenue: undefined }));
              }}
              aria-invalid={Boolean(errors.revenue)}
              aria-describedby={errors.revenue ? 'of-revenue-error' : undefined}
              className={`${inputClass} ${errors.revenue ? 'border-red-500' : ''}`}
            />
            {errors.revenue && <p id="of-revenue-error" className={errorClass}>{errors.revenue}</p>}
            {currency !== 'CAD' && revenue && <p className="text-xs text-gray-400 mt-1">= {formatMoney(convert(revenue))} CAD</p>}
          </div>
          <div>
            <label htmlFor="of-shipping" className={labelClass}>Shipping ({currency})</label>
            <input id="of-shipping" type="number" step="0.01" value={shipping} onChange={(e) => setShipping(e.target.value)} className={inputClass} />
            {currency !== 'CAD' && shipping && <p className="text-xs text-gray-400 mt-1">= {formatMoney(convert(shipping))} CAD</p>}
          </div>
          <div>
            <label htmlFor="of-refunded" className={labelClass}>Refunded (CN¥)</label>
            <input id="of-refunded" type="number" step="0.01" value={refunded} onChange={(e) => setRefunded(e.target.value)} className={inputClass} />
            {refunded && refunded !== '0' && <p className="text-xs text-gray-400 mt-1">= {formatMoney(convertCny(refunded))} CAD</p>}
          </div>
          <div>
            <label htmlFor="of-refunded-used" className={labelClass}>Refunded used (CN¥)</label>
            <input id="of-refunded-used" type="number" step="0.01" value={refundedUsed} onChange={(e) => setRefundedUsed(e.target.value)} className={inputClass} />
            {refundedUsed && refundedUsed !== '0' && <p className="text-xs text-gray-400 mt-1">= {formatMoney(convertCny(refundedUsed))} CAD</p>}
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-gray-900 mb-3">Customer &amp; shipping</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="of-customer" className={labelClass}>Customer name</label>
            <input id="of-customer" type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="of-country" className={labelClass}>Country</label>
            <select id="of-country" aria-label="Country" value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass}>
              <option value="">Select country…</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
              {country && !countryByCode(country) && (
                <option value={country}>{country}</option>
              )}
            </select>
          </div>
          <div>
            <label htmlFor="of-city" className={labelClass}>City</label>
            <input id="of-city" type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="of-region" className={labelClass}>Region/State</label>
            <input id="of-region" type="text" value={region} onChange={(e) => setRegion(e.target.value)} className={inputClass} />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-gray-900 mb-3">Status</legend>
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={draft} onChange={(e) => updateDraft(e.target.checked)} className="rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
            Draft
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={disputed} onChange={(e) => setDisputed(e.target.checked)} className="rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
            Disputed
          </label>
        </div>
        <div>
          <label htmlFor="of-note" className={labelClass}>Note</label>
          <input id="of-note" type="text" value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-gray-900 mb-3">Items</legend>
        <div className="flex items-center justify-between mb-3">
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
      </fieldset>
    </form>
  );
}
