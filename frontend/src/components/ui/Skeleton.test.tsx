import { render, screen } from '@testing-library/react';
import { TableSkeleton } from './Skeleton';

describe('TableSkeleton', () => {
  it('has role="status"', () => {
    render(<TableSkeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the requested number of body rows', () => {
    render(<TableSkeleton rows={3} />);
    const rows = screen.getByRole('status').querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
  });
});
