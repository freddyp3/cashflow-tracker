import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StatsTable, { type StatsColumn } from './StatsTable';

const columns: StatsColumn[] = [
  { key: 'name', label: 'Name' },
  { key: 'units', label: 'Units', format: 'number' },
  { key: 'revenue', label: 'Revenue', format: 'currency' },
  { key: 'margin', label: 'Margin', format: 'margin' },
  { key: 'refund', label: 'Net Refund', format: 'cny' },
];

const data = [
  { name: 'A', units: 5, revenue: 100, margin: 0.1, refund: 10 },
  { name: 'B', units: 3, revenue: 50, margin: 0.45, refund: 20 },
  { name: 'C', units: 8, revenue: 200, margin: 0.9, refund: 30 },
  { name: 'D', units: 1, revenue: 10, margin: 0.6, refund: 40 },
];

function renderTable(props: Partial<Parameters<typeof StatsTable>[0]> = {}) {
  return render(
    <StatsTable
      data={data}
      columns={columns}
      sortKey="revenue"
      sortDir="desc"
      onSort={() => {}}
      {...props}
    />,
  );
}

describe('StatsTable', () => {
  it('highlights the top 3 rows by margin with data-top and bg-amber-50', () => {
    const { container } = renderTable({ highlightKey: 'margin' });
    const tops = container.querySelectorAll('tr[data-top="true"]');
    expect(tops).toHaveLength(3);
    expect(tops[0].className).toContain('bg-amber-50');
  });

  it('renders the margin column as a bar with clamped percent width', () => {
    const { container } = renderTable({ highlightKey: 'margin' });
    const bars = container.querySelectorAll('.h-1\\.5.rounded.bg-amber-500');
    const widths = [...bars].map((b) => (b as HTMLElement).style.width);
    expect(widths).toContain('45%');
    expect(screen.getAllByText('45%')).toHaveLength(1);
  });

  it('calls onSort when a header is clicked and reflects aria-sort', async () => {
    const onSort = vi.fn();
    renderTable({ onSort });
    await userEvent.click(screen.getByRole('button', { name: /revenue/i }));
    expect(onSort).toHaveBeenCalledWith('revenue');

    const th = screen.getByRole('columnheader', { name: /revenue/i });
    expect(th).toHaveAttribute('aria-sort', 'descending');
    const nameTh = screen.getByRole('columnheader', { name: /^name$/i });
    expect(nameTh).toHaveAttribute('aria-sort', 'none');
  });

  it('formats currency, CNY, numbers and nulls', () => {
    renderTable();
    expect(screen.getByText('CA$100.00')).toBeInTheDocument();
    expect(screen.getByText('CN¥10.00')).toBeInTheDocument();
    render(
      <StatsTable data={[{ name: 'E', units: null, revenue: null, margin: null, refund: null }]} columns={columns} sortKey="revenue" sortDir="desc" onSort={() => {}} />,
    );
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('sorts numerically desc and puts nulls last', () => {
    const rows = [
      { name: 'low', revenue: 1 },
      { name: 'none', revenue: null },
      { name: 'high', revenue: 9 },
    ];
    render(<StatsTable data={rows} columns={[{ key: 'name', label: 'Name' }, { key: 'revenue', label: 'Revenue', format: 'currency' }]} sortKey="revenue" sortDir="desc" onSort={() => {}} />);
    const cells = screen.getAllByRole('cell');
    expect(cells[1].textContent).toBe('CA$9.00');
    expect(cells[cells.length - 1].textContent).toBe('—');
  });

  it('renders EmptyState for empty data', () => {
    renderTable({ data: [] });
    expect(screen.getByText('No data for these filters')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
