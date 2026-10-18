import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Drawer from './Drawer';

describe('Drawer', () => {
  it('renders nothing when closed', () => {
    render(
      <Drawer open={false} title="Edit order" onClose={vi.fn()}>
        <p>body</p>
      </Drawer>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders title and children when open', () => {
    render(
      <Drawer open title="Edit order" onClose={vi.fn()}>
        <p>form body</p>
      </Drawer>,
    );
    expect(screen.getByRole('dialog', { name: 'Edit order' })).toBeInTheDocument();
    expect(screen.getByText('form body')).toBeInTheDocument();
  });

  it('calls onClose from the Close button', async () => {
    const onClose = vi.fn();
    render(
      <Drawer open title="Edit order" onClose={onClose}>
        <p>body</p>
      </Drawer>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn();
    render(
      <Drawer open title="Edit order" onClose={onClose}>
        <p>body</p>
      </Drawer>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('hides body overflow while open and restores it on unmount', () => {
    const { unmount } = render(
      <Drawer open title="Edit order" onClose={vi.fn()}>
        <p>body</p>
      </Drawer>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
