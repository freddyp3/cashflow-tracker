import { render, screen, waitFor } from '@testing-library/react';
import GlobePage from './GlobePage';
import type { Order } from '../types';

vi.mock('react-globe.gl', () => ({
  default: vi.fn((props: Record<string, unknown>) => (
    <div
      data-testid="globe-canvas"
      data-points-count={Array.isArray(props.pointsData) ? props.pointsData.length : 0}
      data-arcs-count={Array.isArray(props.arcsData) ? props.arcsData.length : 0}
      data-labels-count={Array.isArray(props.labelsData) ? props.labelsData.length : 0}
    />
  )),
}));

vi.mock('../api/orders', () => ({
  getOrders: vi.fn(),
}));

import { getOrders } from '../api/orders';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const fakeOrder = (shippingLocation: string, disputed = false): Order => ({
  orderId: 1,
  platform: 'Instagram',
  shipping: 10,
  revenue: 50,
  refunded: 0,
  refundedUsed: 0,
  customerName: 'Test',
  shippingLocation,
  disputed,
  orderDate: '2025-01-01',
  deliveredDate: '2025-01-05',
  note: null,
  items: [],
});

const geoJsonResponse = {
  ok: true,
  json: () => Promise.resolve({ features: [{ type: 'Feature' }] }),
};

describe('GlobePage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(getOrders).mockReset();
  });

  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    vi.mocked(getOrders).mockReturnValue(new Promise(() => {}));
    render(<GlobePage />);
    expect(screen.getByText('Loading globe data...')).toBeInTheDocument();
  });

  it('renders the page heading', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    vi.mocked(getOrders).mockReturnValue(new Promise(() => {}));
    render(<GlobePage />);
    expect(screen.getByRole('heading', { name: 'Globe' })).toBeInTheDocument();
  });

  it('shows error when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    vi.mocked(getOrders).mockResolvedValue([]);
    render(<GlobePage />);
    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
    });
  });

  it('renders one dot per order, one arc per destination, one label per region', async () => {
    mockFetch.mockResolvedValue(geoJsonResponse);
    vi.mocked(getOrders).mockResolvedValue([
      fakeOrder('Toronto, ON, CAN'),
      fakeOrder('Toronto, ON, CAN'),          // duplicate location → extra dot, same arc/label
      fakeOrder('Alliston, ON, CAN'),          // same label "ON" → extra dot+arc, no extra label
      fakeOrder('New York, NY, USA'),
      fakeOrder('TBD'),                        // excluded
      fakeOrder('Toronto, ON, CAN', true),     // disputed → excluded
    ]);

    render(<GlobePage />);
    await waitFor(() => {
      const globe = screen.getByTestId('globe-canvas');
      // 1 Vancouver + 4 order dots (2 Toronto + 1 Alliston + 1 NY)
      expect(globe.dataset.pointsCount).toBe('5');
      // 3 arcs (Toronto, Alliston, NY — one per unique location)
      expect(globe.dataset.arcsCount).toBe('3');
      // 2 labels (ON, NY — deduplicated by label text)
      expect(globe.dataset.labelsCount).toBe('2');
    });
  });

  it('includes Vancouver origin point even with no orders', async () => {
    mockFetch.mockResolvedValue(geoJsonResponse);
    vi.mocked(getOrders).mockResolvedValue([]);

    render(<GlobePage />);
    await waitFor(() => {
      const globe = screen.getByTestId('globe-canvas');
      // Just Vancouver origin
      expect(globe.dataset.pointsCount).toBe('1');
      expect(globe.dataset.arcsCount).toBe('0');
      expect(globe.dataset.labelsCount).toBe('0');
    });
  });
});
