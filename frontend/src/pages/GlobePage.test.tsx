import { act, render, screen } from '@testing-library/react';
import GlobePage from './GlobePage';
import type { GlobeSummary } from '../components/globe/aggregate';

const summary: GlobeSummary = {
  countries: 2,
  cities: 3,
  orders: 4,
  top: [
    { location: 'Toronto, ON, CAN', country: 'CAN', lat: 43.65, lng: -79.38, orders: 2, revenue: 150 },
    { location: 'Alliston, ON, CAN', country: 'CAN', lat: 44.15, lng: -79.87, orders: 1, revenue: 60 },
    { location: 'New York, NY, USA', country: 'USA', lat: 40.71, lng: -74, orders: 1, revenue: 80 },
  ],
};

let readyCallback: ((s: GlobeSummary) => void) | undefined;

vi.mock('../components/globe/ShippingGlobe', () => ({
  default: ({ onReady }: { onReady?: (s: GlobeSummary) => void }) => {
    readyCallback = onReady;
    return <div data-testid="shipping-globe" />;
  },
}));

describe('GlobePage', () => {
  beforeEach(() => {
    readyCallback = undefined;
  });

  it('renders the page heading', () => {
    render(<GlobePage />);
    expect(screen.getByRole('heading', { name: 'My Shipping Adventures' })).toBeInTheDocument();
  });

  it('shows — placeholders until the globe is ready', () => {
    render(<GlobePage />);
    expect(screen.getAllByText('—')).not.toHaveLength(0);
    expect(screen.getByText('Top destinations')).toBeInTheDocument();
  });

  it('renders the summary and top destinations after onReady', () => {
    render(<GlobePage />);
    act(() => readyCallback?.(summary));

    expect(screen.getByText(/2 countries · 3 cities · 4 orders/)).toBeInTheDocument();
    expect(screen.getByText('Toronto, ON, CAN')).toBeInTheDocument();
    expect(screen.getByText('New York, NY, USA')).toBeInTheDocument();
    expect(screen.getByText(/CA\$150\.00/)).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });
});
