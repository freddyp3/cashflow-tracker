import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';

vi.mock('../api/stats', () => ({
  getProductStats: vi.fn().mockResolvedValue([]),
  getOverallMonth: vi.fn().mockResolvedValue([]),
}));

const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('HomePage', () => {
  it('renders the page heading', () => {
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });
});
