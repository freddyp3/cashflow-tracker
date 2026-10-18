import { render, screen } from '@testing-library/react';
import Badge from './Badge';

describe('Badge', () => {
  it('applies the amber tone classes', () => {
    render(<Badge tone="amber">Draft</Badge>);
    const badge = screen.getByText('Draft');
    expect(badge.className).toContain('bg-amber-100');
    expect(badge.className).toContain('text-amber-700');
  });

  it('applies the green tone classes', () => {
    render(<Badge tone="green">Paid</Badge>);
    const badge = screen.getByText('Paid');
    expect(badge.className).toContain('bg-green-100');
    expect(badge.className).toContain('text-green-700');
  });
});
