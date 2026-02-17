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
  it('renders the Cool Visualization link pointing to /visualization/globe', () => {
    renderSidebar();
    const link = screen.getByRole('link', { name: /cool visualization/i });
    expect(link).toHaveAttribute('href', '/visualization/globe');
  });

  it('renders all original navigation links', () => {
    renderSidebar();
    ['Home', 'Products', 'Orders', 'Product Stats', 'Platform Stats', 'Hauls'].forEach((label) => {
      expect(screen.getByRole('link', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    });
  });

  it('highlights the active route with amber styling', () => {
    renderSidebar('/visualization/globe');
    const link = screen.getByRole('link', { name: /cool visualization/i });
    expect(link.className).toContain('bg-amber-50');
    expect(link.className).toContain('text-amber-700');
  });
});
