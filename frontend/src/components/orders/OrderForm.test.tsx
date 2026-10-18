import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OrderForm from './OrderForm';
import type { Order, OrderRequest } from '../../types';

vi.mock('../../api/products', () => ({
  getProducts: vi.fn().mockResolvedValue([{ productId: 1, productName: 'Widget', productType: 'T', cost: 10, stockQuantity: 5 }]),
}));

vi.mock('../../api/currency', () => ({
  getRate: vi.fn().mockResolvedValue(1),
}));

const PLATFORMS = ['Grailed', 'Depop', 'eBay', 'Instagram', 'In Person', 'Facebook Marketplace', 'Website', 'Other'];

const order = (over: Partial<Order>): Order => ({
  orderId: 7,
  platform: 'Grailed',
  shipping: 12.5,
  revenue: 100,
  refunded: 0,
  refundedUsed: 0,
  customerName: 'Jane Buyer',
  shippingLocation: 'Geneva, N/A, CHE',
  latitude: null,
  longitude: null,
  disputed: false,
  draft: false,
  orderDate: '2025-01-01',
  deliveredDate: null,
  note: null,
  items: [],
  ...over,
});

function renderForm(props: Partial<Parameters<typeof OrderForm>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSubmit = props.onSubmit ?? vi.fn();
  render(
    <QueryClientProvider client={client}>
      <OrderForm platforms={PLATFORMS} onSubmit={onSubmit} {...props} />
    </QueryClientProvider>,
  );
  return { onSubmit };
}

const submit = () => {
  const form = document.getElementById('order-form') as HTMLFormElement;
  form.requestSubmit();
};

describe('OrderForm', () => {
  it('blocks submit with inline errors when required fields are empty', async () => {
    const { onSubmit } = renderForm();
    await waitFor(() => expect(screen.getByLabelText('Platform')).toBeInTheDocument());
    submit();
    expect(await screen.findByText('Platform is required')).toBeInTheDocument();
    expect(screen.getByText('Revenue is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('allows submission as draft without platform/revenue', async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    await userEvent.click(screen.getByRole('checkbox', { name: 'Draft' }));
    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(vi.mocked(onSubmit).mock.calls[0][0]).toMatchObject({ draft: true });
  });

  it('maps city/region/country to "City, Region, CODE"', async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    await userEvent.selectOptions(screen.getByLabelText('Platform'), 'Grailed');
    await userEvent.type(screen.getByLabelText(/Revenue/), '100');
    await userEvent.type(screen.getByLabelText('City'), 'Toronto');
    await userEvent.type(screen.getByLabelText('Region/State'), 'ON');
    await userEvent.selectOptions(screen.getByLabelText('Country'), 'CAN');
    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const data: OrderRequest = vi.mocked(onSubmit).mock.calls[0][0];
    expect(data.shippingLocation).toBe('Toronto, ON, CAN');
  });

  it('pre-fills country/city/region when editing', () => {
    renderForm({ order: order({}) });
    expect(screen.getByLabelText('Country')).toHaveValue('CHE');
    expect(screen.getByLabelText('City')).toHaveValue('Geneva');
    expect(screen.getByLabelText('Region/State')).toHaveValue('N/A');
  });

  it('sends shipping -1 when the shipping input is blank', async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    await userEvent.selectOptions(screen.getByLabelText('Platform'), 'Grailed');
    await userEvent.type(screen.getByLabelText(/Revenue/), '50');
    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(vi.mocked(onSubmit).mock.calls[0][0].shipping).toBe(-1);
  });
});
