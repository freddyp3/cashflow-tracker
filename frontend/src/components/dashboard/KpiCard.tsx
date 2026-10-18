interface Props {
  label: string;
  value: string;
  delta: string;
  deltaTone: 'up' | 'down' | 'flat';
}

const toneClasses = {
  up: 'text-green-600',
  down: 'text-red-600',
  flat: 'text-gray-400',
} as const;

/** Single dashboard KPI card: label, formatted value, and a delta line vs last month. */
export default function KpiCard({ label, value, delta, deltaTone }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 tabular-nums mt-1">{value}</p>
      <p className={`text-xs mt-2 ${toneClasses[deltaTone]}`}>{delta} vs last month</p>
    </div>
  );
}
