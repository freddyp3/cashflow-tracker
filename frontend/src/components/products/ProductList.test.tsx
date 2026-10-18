import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Product } from '../../types';
import ProductList from './ProductList';

const product = (over: Partial<Product>): Product => ({
  productId: 1,
  productName: 'Penguin Shirt',
  productType: 'Shirts',
  cost: 100,
  stockQuantity: 5,
  ...over,
});

function renderList(products: Product[], cnyRate?: number) {
  return render(
    <MemoryRouter>
      <ProductList products={products} cnyRate={cnyRate} onEdit={() => {}} onDelete={() => {}} />
    </MemoryRouter>,
  );
}

describe('ProductList', () => {
  it('shows the ≈ CA$ hint when a rate is provided and hides it when not', () => {
    renderList([product({ cost: 100 })], 0.2);
    expect(screen.getByText('≈ CA$20.00')).toBeInTheDocument();
    expect(screen.getByText('CN¥100.00')).toBeInTheDocument();
  });

  it('omits the CA$ hint when the rate is undefined', () => {
    renderList([product({ cost: 100 })], undefined);
    expect(screen.queryByText(/≈ CA\$/)).not.toBeInTheDocument();
  });

  it('shows a Low stock badge at 1 and 0, but not at 2', () => {
    renderList([
      product({ productId: 1, productName: 'A', stockQuantity: 1 }),
      product({ productId: 2, productName: 'B', stockQuantity: 0 }),
      product({ productId: 3, productName: 'C', stockQuantity: 2 }),
    ]);
    expect(screen.getAllByText('Low stock')).toHaveLength(2);
  });

  it('links product names to the filtered insights page', () => {
    renderList([product({ productId: 7 })]);
    const link = screen.getByRole('link', { name: 'Penguin Shirt' });
    expect(link).toHaveAttribute('href', '/insights?tab=products&product=7');
  });
});
