import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import OrdersPage from './OrdersPage';

vi.mock('../api/orders', () => ({
  getOrders: vi.fn().mockResolvedValue([]),
  createOrder: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn(),
}));

vi.mock('../api/products', () => ({
  getProducts: vi.fn().mockResolvedValue([]),
}));

vi.mock('../api/currency', () => ({
  getRate: vi.fn().mockResolvedValue(1),
}));

const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('OrdersPage', () => {
  it('renders the page heading', async () => {
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <OrdersPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('heading', { name: 'Orders' })).toBeInTheDocument();
  });
});
