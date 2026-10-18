import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ShippingGlobe from './ShippingGlobe';
import type { GlobeSummary } from './aggregate';
import type { Order } from '../../types';

vi.mock('react-globe.gl', () => ({
  default: vi.fn((props: Record<string, unknown>) => (
    <div
      data-testid="globe-canvas"
      data-points-count={Array.isArray(props.pointsData) ? props.pointsData.length : 0}
      data-arcs-count={Array.isArray(props.arcsData) ? props.arcsData.length : 0}
      data-arc-anim={String(props.arcDashAnimateTime)}
    />
  )),
}));

vi.mock('./webglSupport', () => ({
  default: vi.fn(() => true),
}));

vi.mock('../../api/orders', () => ({
  getOrders: vi.fn(),
}));

import isWebGLAvailable from './webglSupport';
import { getOrders } from '../../api/orders';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const geoJsonResponse = {
  ok: true,
  json: () => Promise.resolve({ features: [{ type: 'Feature' }] }),
};

const order = (over: Partial<Order>): Order => ({
  orderId: 1,
  platform: 'Grailed',
  shipping: 10,
  revenue: 100,
  refunded: 0,
  refundedUsed: 0,
  customerName: 'Test',
  shippingLocation: 'Toronto, ON, CAN',
  latitude: 43.65,
  longitude: -79.38,
  disputed: false,
  draft: false,
  orderDate: '2025-01-01',
  deliveredDate: null,
  note: null,
  items: [],
  ...over,
});

const fixtureOrders: Order[] = [
  order({ shippingLocation: 'Toronto, ON, CAN' }),
  order({ shippingLocation: 'Toronto, ON, CAN' }),
  order({ shippingLocation: 'Alliston, ON, CAN' }),
  order({ shippingLocation: 'New York, NY, USA', latitude: 40.71, longitude: -74 }),
  order({ shippingLocation: 'TBD', latitude: null, longitude: null }),
  order({ shippingLocation: 'Toronto, ON, CAN', disputed: true }),
  order({ shippingLocation: 'Paris, FRA', latitude: null, longitude: null }),
];

function renderGlobe(props: { onReady?: (s: GlobeSummary) => void; size?: number } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ShippingGlobe {...props} />
    </QueryClientProvider>,
  );
}

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
}

describe('ShippingGlobe', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(getOrders).mockReset();
    vi.mocked(isWebGLAvailable).mockReturnValue(true);
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it('shows a skeleton while loading', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    vi.mocked(getOrders).mockReturnValue(new Promise(() => {}));
    renderGlobe();
    expect(screen.getByRole('status', { name: 'Loading globe' })).toBeInTheDocument();
  });

  it('shows an error state with Retry when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    vi.mocked(getOrders).mockResolvedValue([]);
    renderGlobe();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('renders 1 origin + N destination points and N arcs', async () => {
    mockFetch.mockResolvedValue(geoJsonResponse);
    vi.mocked(getOrders).mockResolvedValue(fixtureOrders);
    renderGlobe();
    await waitFor(() => {
      const globe = screen.getByTestId('globe-canvas');
      expect(globe.dataset.pointsCount).toBe('4');
      expect(globe.dataset.arcsCount).toBe('3');
    });
  });

  it('calls onReady with the aggregate summary', async () => {
    mockFetch.mockResolvedValue(geoJsonResponse);
    vi.mocked(getOrders).mockResolvedValue(fixtureOrders);
    const onReady = vi.fn();
    renderGlobe({ onReady });
    await waitFor(() => {
      expect(onReady).toHaveBeenCalledWith(
        expect.objectContaining({ countries: 2, cities: 3, orders: 4 }),
      );
    });
  });

  it('disables arc animation under prefers-reduced-motion', async () => {
    mockMatchMedia(true);
    mockFetch.mockResolvedValue(geoJsonResponse);
    vi.mocked(getOrders).mockResolvedValue(fixtureOrders);
    renderGlobe();
    await waitFor(() => {
      expect(screen.getByTestId('globe-canvas').dataset.arcAnim).toBe('0');
    });
  });

  it('shows the WebGL fallback copy when WebGL is unavailable', () => {
    vi.mocked(isWebGLAvailable).mockReturnValue(false);
    mockFetch.mockReturnValue(new Promise(() => {}));
    vi.mocked(getOrders).mockReturnValue(new Promise(() => {}));
    renderGlobe();
    expect(screen.getByText(/The globe couldn't be displayed/)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
