import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SortableHeader from './SortableHeader';

function renderHeader(props: Parameters<typeof SortableHeader>[0]) {
  return render(
    <table>
      <thead>
        <tr>
          <SortableHeader {...props} />
        </tr>
      </thead>
    </table>,
  );
}

describe('SortableHeader', () => {
  it('renders aria-sort="none" and no arrow when inactive', () => {
    renderHeader({ label: 'Revenue', active: false, dir: 'desc', onClick: () => {} });
    const th = screen.getByRole('columnheader');
    expect(th).toHaveAttribute('aria-sort', 'none');
    expect(th.textContent).not.toContain('▲');
    expect(th.textContent).not.toContain('▼');
  });

  it('renders aria-sort="ascending" with an up arrow when active asc', () => {
    renderHeader({ label: 'Date', active: true, dir: 'asc', onClick: () => {} });
    const th = screen.getByRole('columnheader');
    expect(th).toHaveAttribute('aria-sort', 'ascending');
    expect(th.textContent).toContain('▲');
  });

  it('renders aria-sort="descending" with a down arrow when active desc', () => {
    renderHeader({ label: 'Date', active: true, dir: 'desc', onClick: () => {} });
    const th = screen.getByRole('columnheader');
    expect(th).toHaveAttribute('aria-sort', 'descending');
    expect(th.textContent).toContain('▼');
  });

  it('calls onClick once when the button is clicked', async () => {
    const onClick = vi.fn();
    renderHeader({ label: 'Revenue', active: false, dir: 'desc', onClick });
    await userEvent.click(screen.getByRole('button', { name: 'Revenue' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('adds text-right when align="right"', () => {
    renderHeader({ label: 'Revenue', active: false, dir: 'desc', align: 'right', onClick: () => {} });
    expect(screen.getByRole('columnheader').className).toContain('text-right');
  });
});
