/**
 * Generic table component for displaying stats view results.
 * Supports automatic formatting of currency ($), percent (%), and number columns.
 * Used by both ProductStatsPage and PlatformStatsPage.
 */

interface Props {
  data: Record<string, unknown>[];
  columns: { key: string; label: string; format?: 'currency' | 'cny' | 'number' | 'percent' }[];
}

function formatValue(value: unknown, format?: string): string {
  if (value == null) return '—';
  const num = Number(value);
  if (format === 'currency') return `$${num.toFixed(2)}`;
  if (format === 'cny') return `¥${num.toFixed(2)}`;
  if (format === 'percent') return `${(num * 100).toFixed(0)}%`;
  if (format === 'number') return num.toLocaleString();
  return String(value);
}

export default function StatsTable({ data, columns }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 font-medium text-gray-500 ${
                  col.format === 'currency' || col.format === 'cny' || col.format === 'number' || col.format === 'percent'
                    ? 'text-right'
                    : 'text-left'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 ${
                    col.format === 'currency' || col.format === 'cny' || col.format === 'number' || col.format === 'percent'
                      ? 'text-right text-gray-900'
                      : 'text-left text-gray-700'
                  }`}
                >
                  {formatValue(row[col.key], col.format)}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                No data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
