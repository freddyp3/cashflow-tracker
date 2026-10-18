import { render, screen } from '@testing-library/react';
import Money, { formatMoney } from './Money';

describe('formatMoney', () => {
  it('formats CAD with the CA$ prefix', () => {
    expect(formatMoney(1240)).toBe('CA$1,240.00');
  });

  it('formats USD with the US$ prefix', () => {
    expect(formatMoney(5, 'USD')).toBe('US$5.00');
  });

  it('formats CNY with the CN¥ prefix', () => {
    expect(formatMoney(1234.5, 'CNY')).toBe('CN¥1,234.50');
  });

  it('formats negatives with a leading minus', () => {
    expect(formatMoney(-12.5)).toBe('-CA$12.50');
  });
});

describe('Money', () => {
  it('renders the formatted amount', () => {
    render(<Money amount={1240} />);
    expect(screen.getByText('CA$1,240.00')).toBeInTheDocument();
  });
});
