import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';

vi.mock('../api/stats', () => ({
  getPlatformStats: vi.fn().mockResolvedValue([
    { platform: 'Grailed', platform_revenue: 400, platform_profit: 100, units_sold: 6 },
  ]),
  getProductStats: vi.fn().mockResolvedValue([
    { product_name: 'Jacket', units_sold: 5, product_total_revenue: 200, product_total_profit: 80, product_profit_margin: 0.4 },
  ]),
  getOverallMonth: vi.fn().mockResolvedValue([
    { month: '2026-03-01', month_revenue: 400, month_profit: 100, month_cost: 300, month_units_sold: 6 },
  ]),
}));
vi.mock('../api/orders', () => ({
  getOrders: vi.fn().mockResolvedValue([
    {
      orderId: 1, platform: 'Grailed', shipping: 0, revenue: 100, refunded: 0, refundedUsed: 0,
      customerName: 'Buyer', shippingLocation: 'Toronto, ON, CAN', latitude: null, longitude: null,
      disputed: false, draft: false, orderDate: '2026-03-01', deliveredDate: null, note: null, items: [],
    },
  ]),
}));
vi.mock('../components/globe/ShippingGlobe', () => ({
  default: ({ size }: { size?: number }) => <div data-testid="globe" data-size={size} />,
}));
vi.mock('../components/stats/TimeSeriesChart', () => ({
  default: ({ series }: { series?: string[] }) => <div data-testid="chart" data-series={series?.join(',')} />,
}));

const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderPage() {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HomePage', () => {
  it('renders heading, KPI labels and values', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
    for (const label of ['Revenue', 'Profit', 'Margin', 'Units']) {
      expect((await screen.findAllByText(label)).length).toBeGreaterThan(0);
    }
    expect(await screen.findByText('CA$400.00')).toBeInTheDocument();
  });

  it('renders the globe at 320px and the chart with revenue+profit series', async () => {
    renderPage();
    expect((await screen.findByTestId('globe')).getAttribute('data-size')).toBe('320');
    expect((await screen.findByTestId('chart')).getAttribute('data-series')).toBe('revenue,profit');
  });

  it('renders best sellers and recent orders', async () => {
    renderPage();
    expect(await screen.findByText('Best Selling Products')).toBeInTheDocument();
    expect(await screen.findByText('Jacket')).toBeInTheDocument();
    expect(await screen.findByText('Recent Orders')).toBeInTheDocument();
    expect(await screen.findByText('Buyer')).toBeInTheDocument();
  });
});
