import { useCallback, useMemo, useState } from 'react';
import type { Order } from '../../types';

export type SortKey = 'orderDate' | 'platform' | 'customerName' | 'revenue' | 'shipping' | 'refunded';
export type SortDir = 'asc' | 'desc';
export type StatusFilter = 'all' | 'active' | 'draft' | 'disputed';

export interface TableState {
  search: string;
  /** '' = all platforms */
  platform: string;
  status: StatusFilter;
  sortKey: SortKey;
  sortDir: SortDir;
}

export const DEFAULT_STATE: TableState = {
  search: '',
  platform: '',
  status: 'all',
  sortKey: 'orderDate',
  sortDir: 'desc',
};

/** Numeric/date columns sort desc first when a new column is picked; strings asc. */
const NUMERIC_KEYS: ReadonlySet<SortKey> = new Set(['orderDate', 'revenue', 'shipping', 'refunded']);

function matchesSearch(order: Order, q: string): boolean {
  const hay = [order.customerName, order.note ?? '', ...order.items.map((i) => i.productName ?? '')]
    .join('\n')
    .toLowerCase();
  return hay.includes(q);
}

function matchesStatus(order: Order, status: StatusFilter): boolean {
  switch (status) {
    case 'active':
      return !order.draft && !order.disputed;
    case 'draft':
      return order.draft;
    case 'disputed':
      return order.disputed;
    default:
      return true;
  }
}

function compare(a: Order, b: Order, key: SortKey, dir: SortDir): number {
  const d = dir === 'asc' ? 1 : -1;
  switch (key) {
    case 'orderDate':
      // ISO strings compare lexicographically; null always sorts last.
      if (a.orderDate == null && b.orderDate == null) return 0;
      if (a.orderDate == null) return 1;
      if (b.orderDate == null) return -1;
      return a.orderDate.localeCompare(b.orderDate) * d;
    case 'platform':
      return a.platform.localeCompare(b.platform) * d;
    case 'customerName':
      return a.customerName.localeCompare(b.customerName) * d;
    case 'revenue':
      return (a.revenue - b.revenue) * d;
    case 'shipping':
      return (a.shipping - b.shipping) * d;
    case 'refunded':
      return (a.refunded - b.refunded) * d;
  }
}

/** Applies search, platform/status filters and sorting; stable tiebreak by orderId desc. */
export function applyTable(orders: Order[], s: TableState): Order[] {
  const q = s.search.trim().toLowerCase();
  return orders
    .filter(
      (o) =>
        matchesStatus(o, s.status) &&
        (!s.platform || o.platform === s.platform) &&
        (!q || matchesSearch(o, q)),
    )
    .sort((a, b) => compare(a, b, s.sortKey, s.sortDir) || b.orderId - a.orderId);
}

/** Table state for the orders page; `onSort` toggles direction or picks a new column. */
export function useOrderTable(orders: Order[]) {
  const [state, setState] = useState<TableState>(DEFAULT_STATE);

  const onSort = useCallback((key: SortKey) => {
    setState((prev) =>
      prev.sortKey === key
        ? { ...prev, sortDir: prev.sortDir === 'asc' ? 'desc' : 'asc' }
        : { ...prev, sortKey: key, sortDir: NUMERIC_KEYS.has(key) ? 'desc' : 'asc' },
    );
  }, []);

  const filtered = useMemo(() => applyTable(orders, state), [orders, state]);
  return { state, setState, onSort, filtered };
}
