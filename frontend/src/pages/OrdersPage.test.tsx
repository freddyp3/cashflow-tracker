import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import OrdersPage from './OrdersPage';
import type { Order } from '../types';

vi.mock('../api/orders', () => ({
  getOrders: vi.fn(),
  createOrder: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn(),
}));

vi.mock('../api/products', () => ({
  getProducts: vi.fn().mockResolvedValue([{ productId: 1, productName: 'Widget', productType: 'T', cost: 10, stockQuantity: 5 }]),
}));

vi.mock('../api/currency', () => ({
  getRate: vi.fn().mockResolvedValue(1),
}));

vi.mock('../api/meta', () => ({
  getPlatforms: vi.fn().mockResolvedValue(['Grailed', 'Depop', 'eBay', 'Instagram', 'In Person', 'Facebook Marketplace', 'Website', 'Other']),
}));

import { deleteOrder, getOrders } from '../api/orders';

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

const FIXTURE: Order[] = [
  order({ orderId: 1, customerName: 'Jane Buyer', platform: 'Grailed' }),
  order({ orderId: 2, customerName: 'Ken Seller', platform: 'Depop' }),
];

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.mocked(getOrders).mockResolvedValue(FIXTURE);
  });

  it('renders the page heading', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Orders' })).toBeInTheDocument();
  });

  it('shows a skeleton then the order rows', async () => {
    vi.mocked(getOrders).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();

    vi.mocked(getOrders).mockResolvedValue(FIXTURE);
    renderPage();
    expect(await screen.findByText('Jane Buyer')).toBeInTheDocument();
    expect(screen.getByText('Ken Seller')).toBeInTheDocument();
  });

  it('narrows rows by search', async () => {
    renderPage();
    await screen.findByText('Jane Buyer');
    await userEvent.type(screen.getByLabelText('Search orders'), 'ken');
    expect(screen.queryByText('Jane Buyer')).not.toBeInTheDocument();
    expect(screen.getByText('Ken Seller')).toBeInTheDocument();
  });

  it('narrows rows by platform', async () => {
    renderPage();
    await screen.findByText('Jane Buyer');
    await userEvent.selectOptions(screen.getByLabelText('Platform'), 'Depop');
    expect(screen.queryByText('Jane Buyer')).not.toBeInTheDocument();
    expect(screen.getByText('Ken Seller')).toBeInTheDocument();
  });

  it('opens a New Order drawer', async () => {
    renderPage();
    await screen.findByText('Jane Buyer');
    await userEvent.click(screen.getByRole('button', { name: '+ New Order' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New Order' })).toBeInTheDocument();
  });

  it('asks for confirmation and deletes the order', async () => {
    renderPage();
    await screen.findByText('Jane Buyer');
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Delete this order?')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    // Default sort is date desc with orderId desc tiebreak: row order is id 2, then id 1.
    await waitFor(() => expect(vi.mocked(deleteOrder).mock.calls[0][0]).toBe(2));
  });

  it('shows the empty state when there are no orders', async () => {
    vi.mocked(getOrders).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No orders yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first order to get started.')).toBeInTheDocument();
  });
});
