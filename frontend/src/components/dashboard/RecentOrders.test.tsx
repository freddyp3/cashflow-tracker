import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Order } from '../../types';
import RecentOrders from './RecentOrders';

function order(partial: Partial<Order>): Order {
  return {
    orderId: 1,
    platform: 'Grailed',
    shipping: 0,
    revenue: 100,
    refunded: 0,
    refundedUsed: 0,
    customerName: 'Buyer',
    shippingLocation: 'Toronto, ON, CAN',
    latitude: null,
    longitude: null,
    disputed: false,
    draft: false,
    orderDate: '2026-10-01',
    deliveredDate: null,
    note: null,
    items: [],
    ...partial,
  };
}

describe('RecentOrders', () => {
  it('shows the 5 most recent orders with null dates last and orderId desc tiebreak', () => {
    const orders = [
      order({ orderId: 1, orderDate: '2026-10-01', customerName: 'oldest' }),
      order({ orderId: 2, orderDate: null, customerName: 'no-date-a' }),
      order({ orderId: 9, orderDate: null, customerName: 'no-date-b' }),
      order({ orderId: 3, orderDate: '2026-10-05', customerName: 'newest' }),
      order({ orderId: 4, orderDate: '2026-10-04', customerName: 'second' }),
      order({ orderId: 5, orderDate: '2026-10-03', customerName: 'third' }),
      order({ orderId: 6, orderDate: '2026-10-02', customerName: 'fourth' }),
    ];
    render(
      <MemoryRouter>
        <RecentOrders orders={orders} />
      </MemoryRouter>,
    );
    const names = screen.getAllByText(/newest|second|third|fourth|oldest|no-date/).map((e) => e.textContent);
    expect(names).toEqual(['newest', 'second', 'third', 'fourth', 'oldest']);
    expect(screen.queryByText('no-date-b')).not.toBeInTheDocument();
  });

  it('lists item names with sizes joined by commas', () => {
    render(
      <MemoryRouter>
        <RecentOrders
          orders={[
            order({
              orderId: 1,
              items: [
                { productId: 1, productName: 'Shirt', itemPaid: 10, itemSize: 'M', note: null },
                { productId: 2, productName: 'Belt', itemPaid: 5, itemSize: null, note: null },
              ],
            }),
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Shirt (M), Belt')).toBeInTheDocument();
  });

  it('shows platform and DRAFT badges', () => {
    render(
      <MemoryRouter>
        <RecentOrders orders={[order({ orderId: 1, draft: true })]} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Grailed')).toBeInTheDocument();
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
  });

  it('renders EmptyState when there are no orders', () => {
    render(
      <MemoryRouter>
        <RecentOrders orders={[]} />
      </MemoryRouter>,
    );
    expect(screen.getByText('No orders yet')).toBeInTheDocument();
  });
});
