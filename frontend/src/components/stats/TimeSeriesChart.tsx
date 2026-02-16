/**
 * Reusable line chart component for time-series stats data using Recharts.
 * Renders multiple configurable lines (e.g. revenue, profit, cost) over time.
 * X-axis formats dates as "Mon 'YY". Tooltip shows full month/year and dollar values.
 * Used by ProductStatsPage and PlatformStatsPage for monthly/daily trend charts.
 */
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface LineConfig {
  dataKey: string;
  color: string;
  name: string;
}

interface Props {
  data: Record<string, unknown>[];
  xKey: string;
  lines: LineConfig[];
  title: string;
  granularity?: 'month' | 'day';
}

export default function TimeSeriesChart({ data, xKey, lines, title, granularity = 'month' }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
        <p className="text-gray-400 text-sm">No data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(val: string) => {
              if (!val) return '';
              const d = new Date(val);
              return granularity === 'day'
                ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }}
          />
          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            formatter={(value: number | undefined) => value != null ? [`$${value.toFixed(2)}`] : ['']}
            labelFormatter={(label) => {
              const d = new Date(String(label));
              return granularity === 'day'
                ? d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color}
              name={line.name}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
