import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    render(<ConfirmDialog open={false} title="Delete order?" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a dialog named by its title when open', () => {
    render(<ConfirmDialog open title="Delete order?" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Delete order?' })).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog open title="Delete order?" onConfirm={onConfirm} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel on Escape', async () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="Delete order?" onConfirm={vi.fn()} onCancel={onCancel} />);
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('focuses the Cancel button on open', () => {
    render(<ConfirmDialog open title="Delete order?" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });
});
