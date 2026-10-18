/**
 * Client-side KPI computation for the home dashboard.
 * All-time totals come from the platform stats rows; this-month vs last-month
 * deltas come from the overall-month time series.
 */

type Row = Record<string, unknown>;

export interface Kpis {
  revenue: number;
  profit: number;
  margin: number | null;
  units: number;
  delta: {
    revenue: number | null;
    profit: number | null;
    margin: number | null;
    units: number | null;
  };
}

/** 'YYYY-MM-01' in local time. */
export function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

export function previousMonthKey(d: Date): string {
  return monthKey(new Date(d.getFullYear(), d.getMonth() - 1, 1));
}

const num = (v: unknown): number => Number(v) || 0;

export function computeKpis(platformRows: Row[], monthRows: Row[], today = new Date()): Kpis {
  const revenue = platformRows.reduce((s, r) => s + num(r.platform_revenue), 0);
  const profit = platformRows.reduce((s, r) => s + num(r.platform_profit), 0);
  const units = platformRows.reduce((s, r) => s + num(r.units_sold), 0);
  const margin = revenue > 0 ? profit / revenue : null;

  const thisMonth = monthRows.find((r) => r.month === monthKey(today));
  const lastMonth = monthRows.find((r) => r.month === previousMonthKey(today));

  const thisRev = num(thisMonth?.month_revenue);
  const thisProfit = num(thisMonth?.month_profit);
  const thisUnits = num(thisMonth?.month_units_sold);
  const lastRev = num(lastMonth?.month_revenue);
  const lastProfit = num(lastMonth?.month_profit);
  const lastUnits = num(lastMonth?.month_units_sold);

  return {
    revenue,
    profit,
    margin,
    units,
    delta: {
      revenue: lastRev > 0 ? (thisRev - lastRev) / lastRev : null,
      profit: lastProfit > 0 ? (thisProfit - lastProfit) / lastProfit : null,
      margin: thisRev > 0 && lastRev > 0 ? thisProfit / thisRev - lastProfit / lastRev : null,
      units: lastUnits > 0 ? (thisUnits - lastUnits) / lastUnits : null,
    },
  };
}

/** '▲ 12%' / '▼ 5%' / '—' for ratios; '▲ 3 pts' / '▼ 2 pts' / '—' for margin fractions. */
export function formatDelta(d: number | null, kind: 'ratio' | 'points'): string {
  if (d == null) return '—';
  const arrow = d > 0 ? '▲' : d < 0 ? '▼' : '';
  const suffix = kind === 'ratio' ? '%' : ' pts';
  const magnitude = Math.round(Math.abs(d) * 100);
  return `${arrow ? arrow + ' ' : ''}${magnitude}${suffix}`;
}
