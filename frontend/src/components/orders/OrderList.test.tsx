import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrderList from './OrderList';
import type { Order } from '../../types';
import type { SortDir, SortKey } from './useOrderTable';

const order = (over: Partial<Order>): Order => ({
  orderId: 1,
  platform: 'Grailed',
  shipping: 10,
  revenue: 100,
  refunded: 25,
  refundedUsed: 0,
  customerName: 'Jane Buyer',
  shippingLocation: 'Toronto, ON, CAN',
  latitude: 43.65,
  longitude: -79.38,
  disputed: false,
  draft: false,
  orderDate: '2025-01-01',
  deliveredDate: null,
  note: null,
  items: [],
  ...over,
});

const orders: Order[] = [
  order({
    orderId: 1,
    customerName: 'Jane Buyer',
    shipping: -1,
    refunded: 25,
    items: [
      { orderItemId: 1, productId: 3, productName: 'Leopard Belt', itemPaid: 60, itemSize: 'M', note: null },
    ],
  }),
  order({ orderId: 2, customerName: 'Ken Seller', revenue: 200, draft: true }),
];

function renderList(over: Partial<Parameters<typeof OrderList>[0]> = {}) {
  const props: Parameters<typeof OrderList>[0] = {
    orders,
    sortKey: 'orderDate',
    sortDir: 'desc',
    onSort: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    expandedId: null,
    onToggleExpand: vi.fn(),
    ...over,
  };
  render(<OrderList {...props} />);
  return props;
}

describe('OrderList', () => {
  it('renders — for unknown (-1) shipping and CN¥ refunds', () => {
    renderList();
    const row = screen.getByText('Jane Buyer').closest('tr')!;
    const cells = row.querySelectorAll('td');
    expect(cells[6].textContent).toBe('—');
    expect(screen.getByText('Refunded (CN¥)')).toBeInTheDocument();
    expect(cells[7].textContent).toContain('CN¥25.00');
    expect(screen.getByText(/CA\$100\.00/)).toBeInTheDocument();
  });

  it('shows DRAFT badge on draft orders', () => {
    renderList();
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
  });

  it('calls onSort when a sortable header is clicked and sets aria-sort', async () => {
    const onSort = vi.fn();
    renderList({ onSort, sortKey: 'revenue' as SortKey, sortDir: 'desc' as SortDir });

    const revenueTh = screen.getByRole('columnheader', { name: /Revenue/ });
    expect(revenueTh).toHaveAttribute('aria-sort', 'descending');
    const platformTh = screen.getByRole('columnheader', { name: 'Platform' });
    expect(platformTh).toHaveAttribute('aria-sort', 'none');

    await userEvent.click(screen.getByRole('button', { name: 'Platform' }));
    expect(onSort).toHaveBeenCalledWith('platform');
  });

  it('expands to show item rows', async () => {
    const onToggleExpand = vi.fn();
    const { rerender } = render(
      <OrderList
        orders={orders}
        sortKey="orderDate"
        sortDir="desc"
        onSort={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        expandedId={null}
        onToggleExpand={onToggleExpand}
      />,
    );
    expect(screen.queryByText('Leopard Belt')).not.toBeInTheDocument();

    const expanders = screen.getAllByRole('button', { name: 'Show items' });
    await userEvent.click(expanders[0]);
    expect(onToggleExpand).toHaveBeenCalledWith(1);

    rerender(
      <OrderList
        orders={orders}
        sortKey="orderDate"
        sortDir="desc"
        onSort={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        expandedId={1}
        onToggleExpand={onToggleExpand}
      />,
    );
    expect(screen.getByText('Leopard Belt')).toBeInTheDocument();

    rerender(
      <OrderList
        orders={orders}
        sortKey="orderDate"
        sortDir="desc"
        onSort={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        expandedId={2}
        onToggleExpand={onToggleExpand}
      />,
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
  });
});
