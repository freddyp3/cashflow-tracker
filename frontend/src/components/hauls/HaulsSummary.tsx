/** Balance / income / expenses summary cards above the hauls table. */
import type { PersonalHaul } from '../../types';
import { formatMoney } from '../ui';
import { summarize } from './haulMath';

interface Props {
  hauls: PersonalHaul[];
}

function Card({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums mt-1 ${tone}`}>{value}</p>
    </div>
  );
}

export default function HaulsSummary({ hauls }: Props) {
  const { balance, income, expenses } = summarize(hauls);
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <Card label="Balance" value={formatMoney(balance)} tone={balance >= 0 ? 'text-green-600' : 'text-red-600'} />
      <Card label="Income" value={formatMoney(income)} tone="text-green-600" />
      <Card label="Expenses" value={formatMoney(expenses)} tone="text-red-600" />
    </div>
  );
}
