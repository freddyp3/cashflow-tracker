import { render, screen } from '@testing-library/react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders title, description and action', () => {
    render(
      <EmptyState
        title="No orders yet"
        description="Orders will appear here."
        action={<button>Add order</button>}
      />,
    );
    expect(screen.getByText('No orders yet')).toBeInTheDocument();
    expect(screen.getByText('Orders will appear here.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add order' })).toBeInTheDocument();
  });
});
