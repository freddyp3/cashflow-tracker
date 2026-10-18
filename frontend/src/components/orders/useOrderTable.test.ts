import { applyTable, DEFAULT_STATE, type TableState } from './useOrderTable';
import type { Order } from '../../types';

const order = (over: Partial<Order>): Order => ({
  orderId: 1,
  platform: 'Grailed',
  shipping: 10,
  revenue: 100,
  refunded: 0,
  refundedUsed: 0,
  customerName: 'Jane Buyer',
  shippingLocation: 'Toronto, ON, CAN',
  latitude: null,
  longitude: null,
  disputed: false,
  draft: false,
  orderDate: '2025-01-01',
  deliveredDate: null,
  note: null,
  items: [],
  ...over,
});

const orders: Order[] = [
  order({ orderId: 1, customerName: 'Jane Buyer', revenue: 50, orderDate: '2025-01-05', items: [{ orderItemId: 1, productId: 1, productName: 'Leopard Belt', itemPaid: 40, itemSize: 'M', note: null }] }),
  order({ orderId: 2, customerName: 'Ken Seller', revenue: 200, orderDate: '2025-02-01', platform: 'Depop', note: 'fragile item' }),
  order({ orderId: 3, customerName: 'Null Dater', revenue: 10, orderDate: null, draft: true }),
  order({ orderId: 4, customerName: 'Dis Puter', revenue: 999, orderDate: '2024-12-31', disputed: true }),
];

const state = (over: Partial<TableState>): TableState => ({ ...DEFAULT_STATE, ...over });

describe('applyTable', () => {
  it('default sorts by date desc with null dates last', () => {
    const out = applyTable(orders, state({}));
    expect(out.map((o) => o.orderId)).toEqual([2, 1, 4, 3]);
  });

  it('searches customer, note and product name case-insensitively', () => {
    expect(applyTable(orders, state({ search: 'LEOPARD' })).map((o) => o.orderId)).toEqual([1]);
    expect(applyTable(orders, state({ search: 'fragile' })).map((o) => o.orderId)).toEqual([2]);
    expect(applyTable(orders, state({ search: 'jane' })).map((o) => o.orderId)).toEqual([1]);
  });

  it('filters by status', () => {
    expect(applyTable(orders, state({ status: 'active' })).map((o) => o.orderId)).toEqual([2, 1]);
    expect(applyTable(orders, state({ status: 'draft' })).map((o) => o.orderId)).toEqual([3]);
    expect(applyTable(orders, state({ status: 'disputed' })).map((o) => o.orderId)).toEqual([4]);
  });

  it('filters by platform', () => {
    expect(applyTable(orders, state({ platform: 'Depop' })).map((o) => o.orderId)).toEqual([2]);
  });

  it('sorts by revenue asc and desc', () => {
    expect(applyTable(orders, state({ sortKey: 'revenue', sortDir: 'desc' }))[0].orderId).toBe(4);
    const asc = applyTable(orders, state({ sortKey: 'revenue', sortDir: 'asc' }));
    expect(asc[0].orderId).toBe(3);
    expect(asc.map((o) => o.orderId)).toEqual([3, 1, 2, 4]);
  });

  it('sorts strings with localeCompare', () => {
    const out = applyTable(orders, state({ sortKey: 'customerName', sortDir: 'asc' }));
    expect(out[0].customerName).toBe('Dis Puter');
  });
});
