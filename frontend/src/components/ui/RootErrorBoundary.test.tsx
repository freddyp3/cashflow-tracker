import { render, screen } from '@testing-library/react';
import RootErrorBoundary from './RootErrorBoundary';

function Bomb(): never {
  throw new Error('boom');
}

describe('RootErrorBoundary', () => {
  it('renders the alert fallback when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <RootErrorBoundary>
        <Bomb />
      </RootErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('The app hit an unexpected error.')).toBeInTheDocument();
  });
});
