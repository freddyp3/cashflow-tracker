import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ProductsPage from './ProductsPage';

vi.mock('../api/products', () => ({
  getProducts: vi.fn().mockResolvedValue([]),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}));

const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('ProductsPage', () => {
  it('renders the page heading', async () => {
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ProductsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument();
  });
});
