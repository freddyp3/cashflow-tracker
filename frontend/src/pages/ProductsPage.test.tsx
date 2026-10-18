import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ProductsPage from './ProductsPage';
import { expectNoA11yViolations } from '../test/axe';

vi.mock('../api/products', () => ({
  getProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}));
vi.mock('../api/currency', () => ({
  getRate: vi.fn().mockResolvedValue(0.2),
}));

import { deleteProduct, getProducts } from '../api/products';

const FIXTURE = [
  { productId: 1, productName: 'Penguin Shirt', productType: 'Shirts', cost: 100, stockQuantity: 5 },
  { productId: 2, productName: 'Patch', productType: 'Accessories', cost: 10, stockQuantity: 1 },
];

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProductsPage', () => {
  beforeEach(() => {
    vi.mocked(getProducts).mockResolvedValue(FIXTURE);
  });

  it('renders heading and product rows', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument();
    expect(await screen.findByText('Penguin Shirt')).toBeInTheDocument();
    expect(screen.getByText('Low stock')).toBeInTheDocument();
  });

  it('opens the New Product drawer and validates the name on submit', async () => {
    renderPage();
    await screen.findByText('Penguin Shirt');
    await userEvent.click(screen.getByRole('button', { name: '+ New Product' }));
    const dialog = await screen.findByRole('dialog');
    expect(screen.getByRole('heading', { name: 'New Product' })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Product name is required')).toBeInTheDocument();
  });

  it('confirms before deleting a product', async () => {
    renderPage();
    await screen.findByText('Penguin Shirt');
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(screen.getByText('Delete this product?')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(vi.mocked(deleteProduct).mock.calls[0][0]).toBe(1));
  });

  it('shows the empty state when there are no products', async () => {
    vi.mocked(getProducts).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No products yet')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderPage();
    await screen.findByText('Penguin Shirt');
    await expectNoA11yViolations(container);
  });

  it('has no axe violations with the drawer open', async () => {
    renderPage();
    await screen.findByText('Penguin Shirt');
    await userEvent.click(screen.getByRole('button', { name: '+ New Product' }));
    await screen.findByRole('dialog');
    await expectNoA11yViolations(document.body);
  });
});
