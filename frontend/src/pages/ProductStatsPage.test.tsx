import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ProductStatsPage from './ProductStatsPage';

vi.mock('../api/stats', () => ({
  getProductStats: vi.fn().mockResolvedValue([]),
  getProductByPlatformStats: vi.fn().mockResolvedValue([]),
  getProductMonth: vi.fn().mockResolvedValue([]),
  getProductDay: vi.fn().mockResolvedValue([]),
}));

vi.mock('../api/products', () => ({
  getProducts: vi.fn().mockResolvedValue([]),
}));

vi.mock('../api/meta', () => ({
  getPlatforms: vi.fn().mockResolvedValue([]),
  getCountries: vi.fn().mockResolvedValue([]),
}));

const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('ProductStatsPage', () => {
  it('renders the page heading', () => {
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ProductStatsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Product Stats' })).toBeInTheDocument();
  });
});
