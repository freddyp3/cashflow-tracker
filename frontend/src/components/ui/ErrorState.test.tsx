import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorState from './ErrorState';

describe('ErrorState', () => {
  it('has role="alert"', () => {
    render(<ErrorState />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('calls onRetry when the Retry button is clicked', async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders no button when onRetry is omitted', () => {
    render(<ErrorState />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
