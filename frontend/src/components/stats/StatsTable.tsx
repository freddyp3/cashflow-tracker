/**
 * Generic sortable stats table. Numeric columns sort numerically, others via
 * localeCompare, nulls last. `format: 'margin'` draws an in-cell bar, and the
 * top `highlightTop` rows by `highlightKey` get an amber highlight.
 */
import { EmptyState, formatMoney } from '../ui';

export interface StatsColumn {
  key: string;
  label: string;
  format?: 'currency' | 'cny' | 'number' | 'percent' | 'margin';
}

type Row = Record<string, unknown>;

interface Props {
  data: Row[];
  columns: StatsColumn[];
  sortKey: string;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
  highlightKey?: string;
  highlightTop?: number;
}

const NUMERIC_FORMATS = new Set(['currency', 'cny', 'number', 'percent', 'margin']);

function isRightAligned(format?: StatsColumn['format']): boolean {
  return format != null && NUMERIC_FORMATS.has(format);
}

function formatValue(value: unknown, format?: StatsColumn['format']): string {
  if (value == null) return '—';
  const num = Number(value);
  if (format === 'currency') return formatMoney(num);
  if (format === 'cny') return formatMoney(num, 'CNY');
  if (format === 'percent') return `${(num * 100).toFixed(0)}%`;
  if (format === 'number') return num.toLocaleString();
  return String(value);
}

function MarginCell({ value }: { value: unknown }) {
  const num = value == null ? 0 : Number(value);
  const pct = Math.min(100, Math.max(0, num * 100));
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="h-1.5 w-16 rounded bg-gray-100">
        <div className="h-1.5 rounded bg-amber-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

function compareValues(a: unknown, b: unknown, dir: 'asc' | 'desc'): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const d = dir === 'asc' ? 1 : -1;
  const an = Number(a);
  const bn = Number(b);
  if (!Number.isNaN(an) && !Number.isNaN(bn)) return (an - bn) * d;
  return String(a).localeCompare(String(b)) * d;
}

export default function StatsTable({
  data,
  columns,
  sortKey,
  sortDir,
  onSort,
  highlightKey,
  highlightTop = 3,
}: Props) {
  const sorted = [...data].sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir));

  const highlighted = new Set<number>();
  if (highlightKey) {
    [...data]
      .map((row, i) => ({ i, v: Number(row[highlightKey]) }))
      .sort((a, b) => b.v - a.v)
      .slice(0, highlightTop)
      .forEach(({ i }) => highlighted.add(i));
  }

  if (data.length === 0) {
    return <EmptyState title="No data for these filters" />;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                aria-sort={col.key === sortKey ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                className={`px-4 py-3 font-medium text-gray-500 ${isRightAligned(col.format) ? 'text-right' : 'text-left'}`}
              >
                <button
                  type="button"
                  onClick={() => onSort(col.key)}
                  className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-900"
                >
                  {col.label}
                  {col.key === sortKey && (
                    <span aria-hidden>{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const origIndex = data.indexOf(row);
            return (
              <tr
                key={origIndex}
                data-top={highlighted.has(origIndex) ? 'true' : undefined}
                className={`border-b border-gray-100 hover:bg-gray-50 ${highlighted.has(origIndex) ? 'bg-amber-50' : ''}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 ${isRightAligned(col.format) ? 'text-right text-gray-900' : 'text-left text-gray-700'}`}
                  >
                    {col.format === 'margin' ? <MarginCell value={row[col.key]} /> : formatValue(row[col.key], col.format)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
