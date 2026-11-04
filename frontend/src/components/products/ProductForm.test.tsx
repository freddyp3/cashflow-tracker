import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Product } from '../../types';
import ProductForm from './ProductForm';

const submitted = () => screen.getByRole('button', { name: 'Save' });

function renderForm(onSubmit = vi.fn(), product?: Product) {
  render(
    <>
      <ProductForm product={product} onSubmit={onSubmit} />
      {/* Mirrors the page Drawer footer, which submits via form="product-form". */}
      <button type="submit" form="product-form">Save</button>
    </>,
  );
  return onSubmit;
}

async function fillRequiredFields() {
  await userEvent.type(screen.getByLabelText('Product name'), 'Penguin Shirt');
  await userEvent.type(screen.getByLabelText('Cost (CN¥)'), '50');
}

describe('ProductForm', () => {
  it('submits kind business by default', async () => {
    const onSubmit = renderForm();
    await fillRequiredFields();
    await userEvent.click(submitted());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'business', productName: 'Penguin Shirt' }),
    );
  });

  it('submits kind personal when Personal is selected', async () => {
    const onSubmit = renderForm();
    await fillRequiredFields();
    await userEvent.selectOptions(screen.getByLabelText('Kind'), 'personal');
    await userEvent.click(submitted());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'personal' }));
  });
});
