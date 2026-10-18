import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PersonalHaulsPage from './PersonalHaulsPage';
import { expectNoA11yViolations } from '../test/axe';
import type { PersonalHaul } from '../types';

vi.mock('../api/personalHauls', () => ({
  getPersonalHauls: vi.fn(),
  createPersonalHaul: vi.fn(),
  deletePersonalHaul: vi.fn(),
}));

import { deletePersonalHaul, getPersonalHauls } from '../api/personalHauls';

const FIXTURE: PersonalHaul[] = [
  { entryTime: '2025-01-01T12:00:00Z', flowType: 'income', amount: 100, note: 'sold jacket' },
  { entryTime: '2025-01-03T12:00:00Z', flowType: 'expense', amount: 30, note: 'thrift haul' },
  { entryTime: '2025-01-02T12:00:00Z', flowType: 'expense', amount: 20, note: null },
];

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PersonalHaulsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PersonalHaulsPage', () => {
  beforeEach(() => {
    vi.mocked(getPersonalHauls).mockResolvedValue(FIXTURE);
  });

  it('renders the heading and summary values', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Personal Hauls' })).toBeInTheDocument();
    expect((await screen.findAllByText('Balance')).length).toBeGreaterThan(0);
    // balance (50) and expenses (50) share the same formatted value
    expect(screen.getAllByText('CA$50.00').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('CA$100.00').length).toBeGreaterThanOrEqual(1); // income (also a row balance)
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('Expenses')).toBeInTheDocument();
  });

  it('lists entries newest-first with formatted dates and signed amounts', async () => {
    renderPage();
    const notes = await screen.findAllByText(/thrift haul|sold jacket|—/);
    expect(notes[0].textContent).toBe('thrift haul');
    expect(screen.getByText('Jan 3, 2025')).toBeInTheDocument();
    expect(screen.getByText('-CA$30.00')).toBeInTheDocument();
    expect(screen.getByText('+CA$100.00')).toBeInTheDocument();
  });

  it('validates the amount inline', async () => {
    renderPage();
    await screen.findByText('thrift haul');
    await userEvent.click(screen.getByRole('button', { name: '+ New Entry' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Amount must be greater than 0')).toBeInTheDocument();
  });

  it('confirms before deleting an entry', async () => {
    renderPage();
    await screen.findByText('thrift haul');
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(screen.getByText('Delete this entry?')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(vi.mocked(deletePersonalHaul).mock.calls[0][0]).toBe('2025-01-03T12:00:00Z'),
    );
  });

  it('shows the empty state when there are no entries', async () => {
    vi.mocked(getPersonalHauls).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No haul entries yet')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderPage();
    await screen.findByText('thrift haul');
    await expectNoA11yViolations(container);
  });
});
