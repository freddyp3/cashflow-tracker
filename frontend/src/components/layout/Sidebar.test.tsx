import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';

function renderSidebar(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Sidebar />
    </MemoryRouter>
  );
}

describe('Sidebar', () => {
  it('renders the Shipping Map link pointing to /visualization/globe', () => {
    renderSidebar();
    const link = screen.getByRole('link', { name: /shipping map/i });
    expect(link).toHaveAttribute('href', '/visualization/globe');
  });

  it('renders all original navigation links', () => {
    renderSidebar();
    ['Home', 'Products', 'Orders', 'Insights', 'Hauls'].forEach((label) => {
      expect(screen.getByRole('link', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    });
  });

  it('highlights the active route with amber styling', () => {
    renderSidebar('/visualization/globe');
    const link = screen.getByRole('link', { name: /shipping map/i });
    expect(link.className).toContain('bg-amber-50');
    expect(link.className).toContain('text-amber-700');
  });

  it('collapses to an icon rail below 1100px', () => {
    const { container } = renderSidebar();
    const aside = container.querySelector('aside');
    expect(aside?.className).toContain('w-16');
    expect(aside?.className).toContain('min-[1100px]:w-56');
  });

  it('gives every nav link a title attribute', () => {
    renderSidebar();
    const nav = screen.getByRole('navigation');
    nav.querySelectorAll('a').forEach((link) => {
      expect(link).toHaveAttribute('title');
    });
  });
});
