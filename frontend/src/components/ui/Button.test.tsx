import { render, screen } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('defaults to type="button"', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole('button', { name: 'Click' })).toHaveAttribute('type', 'button');
  });

  it('applies primary variant classes', () => {
    render(<Button variant="primary">Click</Button>);
    expect(screen.getByRole('button').className).toContain('bg-amber-500');
  });

  it('applies disabled styles', () => {
    render(<Button disabled>Click</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.className).toContain('cursor-not-allowed');
  });
});
