import type { Order } from '../../types';

/** True when the order contains at least one personal (kind='personal') product. */
export function isPersonalOrder(order: Order): boolean {
  return order.items.some((i) => i.productKind === 'personal');
}
