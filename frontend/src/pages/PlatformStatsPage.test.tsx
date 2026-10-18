import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PlatformStatsPage from './PlatformStatsPage';

vi.mock('../api/stats', () => ({
  getPlatformStats: vi.fn().mockResolvedValue([]),
  getPlatformMonth: vi.fn().mockResolvedValue([]),
  getPlatformDay: vi.fn().mockResolvedValue([]),
}));

vi.mock('../api/meta', () => ({
  getPlatforms: vi.fn().mockResolvedValue([]),
  getCountries: vi.fn().mockResolvedValue([]),
}));

const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('PlatformStatsPage', () => {
  it('renders the page heading', () => {
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PlatformStatsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Platform Stats' })).toBeInTheDocument();
  });
});
