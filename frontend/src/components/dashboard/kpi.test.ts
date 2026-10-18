import { computeKpis, formatDelta, monthKey, previousMonthKey } from './kpi';

describe('monthKey / previousMonthKey', () => {
  it('formats YYYY-MM-01 in local time', () => {
    expect(monthKey(new Date(2026, 9, 17))).toBe('2026-10-01');
    expect(monthKey(new Date(2026, 0, 5))).toBe('2026-01-01');
  });

  it('rolls back a month, including January → previous December', () => {
    expect(previousMonthKey(new Date(2026, 9, 17))).toBe('2026-09-01');
    expect(previousMonthKey(new Date(2026, 0, 15))).toBe('2025-12-01');
  });
});

describe('computeKpis', () => {
  const today = new Date(2026, 9, 15); // 2026-10

  it('sums all-time revenue, profit, units and derives margin', () => {
    const platform = [
      { platform_revenue: 100, platform_profit: 40, units_sold: 2 },
      { platform_revenue: 300, platform_profit: 60, units_sold: 4 },
    ];
    const k = computeKpis(platform, [], today);
    expect(k.revenue).toBe(400);
    expect(k.profit).toBe(100);
    expect(k.units).toBe(6);
    expect(k.margin).toBeCloseTo(0.25);
  });

  it('returns null margin when revenue is 0', () => {
    expect(computeKpis([{ platform_revenue: 0, platform_profit: 0, units_sold: 0 }], [], today).margin).toBeNull();
  });

  it('computes ratio deltas this-month vs last-month', () => {
    const months = [
      { month: '2026-10-01', month_revenue: 150, month_profit: 60, month_units_sold: 9 },
      { month: '2026-09-01', month_revenue: 100, month_profit: 40, month_units_sold: 6 },
    ];
    const k = computeKpis([], months, today);
    expect(k.delta.revenue).toBeCloseTo(0.5);
    expect(k.delta.profit).toBeCloseTo(0.5);
    expect(k.delta.units).toBeCloseTo(0.5);
    expect(k.delta.margin).toBeCloseTo(0); // same margin both months
  });

  it('margin delta is a fraction (points when ×100)', () => {
    const months = [
      { month: '2026-10-01', month_revenue: 100, month_profit: 50, month_units_sold: 1 },
      { month: '2026-09-01', month_revenue: 100, month_profit: 40, month_units_sold: 1 },
    ];
    expect(computeKpis([], months, today).delta.margin).toBeCloseTo(0.1);
  });

  it('returns null deltas when last month is missing or zero', () => {
    const months = [{ month: '2026-10-01', month_revenue: 10, month_profit: 5, month_units_sold: 1 }];
    const k = computeKpis([], months, today);
    expect(k.delta.revenue).toBeNull();
    expect(k.delta.profit).toBeNull();
    expect(k.delta.units).toBeNull();
    expect(k.delta.margin).toBeNull();
  });

  it('missing month rows are treated as zeros', () => {
    const months = [{ month: '2026-09-01', month_revenue: 100, month_profit: 50, month_units_sold: 2 }];
    const k = computeKpis([], months, today);
    expect(k.delta.revenue).toBeCloseTo(-1);
    expect(k.delta.margin).toBeNull(); // this-month revenue is 0
  });
});

describe('formatDelta', () => {
  it('formats ratios', () => {
    expect(formatDelta(0.12, 'ratio')).toBe('▲ 12%');
    expect(formatDelta(-0.05, 'ratio')).toBe('▼ 5%');
    expect(formatDelta(0, 'ratio')).toBe('0%');
    expect(formatDelta(null, 'ratio')).toBe('—');
  });

  it('formats margin points', () => {
    expect(formatDelta(0.03, 'points')).toBe('▲ 3 pts');
    expect(formatDelta(-0.02, 'points')).toBe('▼ 2 pts');
    expect(formatDelta(0, 'points')).toBe('0 pts');
    expect(formatDelta(null, 'points')).toBe('—');
  });
});
