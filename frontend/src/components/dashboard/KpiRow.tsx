import { Skeleton, formatMoney } from '../ui';
import KpiCard from './KpiCard';
import { formatDelta, type Kpis } from './kpi';

interface Props {
  kpis: Kpis | undefined;
  loading: boolean;
}

function tone(v: number | null): 'up' | 'down' | 'flat' {
  if (v == null || v === 0) return 'flat';
  return v > 0 ? 'up' : 'down';
}

/** Row of four KPI cards: revenue, profit, margin, units — with deltas vs last month. */
export default function KpiRow({ kpis, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const delta = kpis?.delta ?? { revenue: null, profit: null, margin: null, units: null };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="Revenue"
        value={formatMoney(kpis?.revenue ?? 0)}
        delta={formatDelta(delta.revenue, 'ratio')}
        deltaTone={tone(delta.revenue)}
      />
      <KpiCard
        label="Profit"
        value={formatMoney(kpis?.profit ?? 0)}
        delta={formatDelta(delta.profit, 'ratio')}
        deltaTone={tone(delta.profit)}
      />
      <KpiCard
        label="Margin"
        value={kpis?.margin != null ? `${(kpis.margin * 100).toFixed(0)}%` : '—'}
        delta={formatDelta(delta.margin, 'points')}
        deltaTone={tone(delta.margin)}
      />
      <KpiCard
        label="Units"
        value={(kpis?.units ?? 0).toLocaleString()}
        delta={formatDelta(delta.units, 'ratio')}
        deltaTone={tone(delta.units)}
      />
    </div>
  );
}
