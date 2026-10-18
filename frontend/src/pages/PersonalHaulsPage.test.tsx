import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PersonalHaulsPage from './PersonalHaulsPage';

vi.mock('../api/personalHauls', () => ({
  getPersonalHauls: vi.fn().mockResolvedValue([]),
  createPersonalHaul: vi.fn(),
  deletePersonalHaul: vi.fn(),
}));

const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('PersonalHaulsPage', () => {
  it('renders the page heading', async () => {
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PersonalHaulsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('heading', { name: 'Personal Hauls' })).toBeInTheDocument();
  });
});
