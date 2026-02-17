import { render, screen, waitFor } from '@testing-library/react';
import GlobePage from './GlobePage';

vi.mock('react-globe.gl', () => ({
  default: vi.fn(() => <div data-testid="globe-canvas" />),
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('GlobePage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<GlobePage />);
    expect(screen.getByText('Loading globe data...')).toBeInTheDocument();
  });

  it('renders the page heading', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<GlobePage />);
    expect(screen.getByRole('heading', { name: 'Globe' })).toBeInTheDocument();
  });

  it('shows error when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    render(<GlobePage />);
    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
    });
  });

  it('renders globe after data loads', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [{ type: 'Feature' }] }),
    });
    render(<GlobePage />);
    await waitFor(() => {
      expect(screen.getByTestId('globe-canvas')).toBeInTheDocument();
    });
  });
});
