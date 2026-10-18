import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InsightsPage from './InsightsPage';
import { expectNoA11yViolations } from '../test/axe';

vi.mock('../api/stats', () => ({
  getProductStats: vi.fn(async () => [
    { product_id: 1, product_name: 'Jacket', units_sold: 2, product_total_revenue: 100, product_total_cost: 30, product_total_profit: 70, product_profit_margin: 0.7, avg_product_revenue: 50, product_total_refunded: 0, product_net_refund: 0 },
  ]),
  getPlatformStats: vi.fn(async () => [
    { platform: 'Grailed', units_sold: 4, platform_revenue: 200, platform_total_cost: 60, platform_profit: 140, platform_profit_margin: 0.7, avg_platform_revenue: 50, platform_refunded: 0, platform_net_refund: 0 },
  ]),
  getProductMonth: vi.fn(async () => [
    { month: '2025-09-01', month_revenue: 10, month_profit: 4, month_cost: 6 },
    { month: '2025-09-01', month_revenue: 20, month_profit: 8, month_cost: 12 },
  ]),
  getProductDay: vi.fn(async () => [{ day: '2025-09-02', day_revenue: 10, day_profit: 4, day_cost: 6 }]),
  getPlatformMonth: vi.fn(async () => [{ month: '2025-09-01', month_revenue: 10, month_profit: 4, month_cost: 6 }]),
  getPlatformDay: vi.fn(async () => [{ day: '2025-09-02', day_revenue: 10, day_profit: 4, day_cost: 6 }]),
}));
vi.mock('../api/meta', () => ({
  getCountries: vi.fn(async () => ['Canada', 'United States']),
  getPlatforms: vi.fn(async () => ['Grailed', 'eBay']),
}));
vi.mock('../api/products', () => ({
  getProducts: vi.fn(async () => [{ productId: 1, productName: 'Jacket' }]),
}));
vi.mock('../components/stats/TimeSeriesChart', () => ({
  default: ({ data, series }: { data: unknown[]; series: string[] }) => (
    <div data-testid="chart" data-rows={data.length} data-series={series.join(',')} />
  ),
}));

import { getProductStats, getProductDay } from '../api/stats';

function LocationProbe() {
  const l = useLocation();
  return <div data-testid="loc">{l.pathname + l.search}</div>;
}

function renderPage(initial = '/insights') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initial]}>
        <InsightsPage />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('InsightsPage', () => {
  it('defaults to the products tab with a product filter', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Insights' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Products' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByLabelText('Product:')).toBeInTheDocument();
    await screen.findByRole('cell', { name: 'Jacket' });
  });

  it('shows the platform filter and platform rows on ?tab=platforms', async () => {
    renderPage('/insights?tab=platforms');
    expect(await screen.findByLabelText('Platform:')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Platforms' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('cell', { name: 'Grailed' })).toBeInTheDocument();
  });

  it('updates the URL when the Platforms tab is clicked', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: 'Platforms' }));
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('tab=platforms'));
  });

  it('refetches stats with the chosen country', async () => {
    renderPage();
    await screen.findByRole('cell', { name: 'Jacket' });
    await userEvent.selectOptions(screen.getByLabelText('Country:'), 'Canada');
    await waitFor(() => expect(getProductStats).toHaveBeenCalledWith('Canada'));
  });

  it('toggles Cost off and keeps at least one series on', async () => {
    renderPage();
    const chart = await screen.findByTestId('chart');
    expect(chart.getAttribute('data-series')).toBe('revenue,profit,cost');

    const group = screen.getByRole('group', { name: 'Chart series' });
    await userEvent.click(within(group).getByRole('button', { name: 'Cost' }));
    await waitFor(() => expect(chart.getAttribute('data-series')).toBe('revenue,profit'));

    await userEvent.click(within(group).getByRole('button', { name: 'Profit' }));
    await waitFor(() => expect(chart.getAttribute('data-series')).toBe('revenue'));

    await userEvent.click(within(group).getByRole('button', { name: 'Revenue' }));
    expect(chart.getAttribute('data-series')).toBe('revenue');
  });

  it('collapses per-product rows in the same period to a single chart row', async () => {
    renderPage();
    const chart = await screen.findByTestId('chart');
    expect(chart.getAttribute('data-rows')).toBe('1');
  });

  it('Daily switch calls getProductDay', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Daily' }));
    await waitFor(() => expect(getProductDay).toHaveBeenCalled());
  });

  it('has no axe violations', async () => {
    const { container } = renderPage();
    await screen.findByRole('cell', { name: 'Jacket' });
    await expectNoA11yViolations(container);
  });
});
