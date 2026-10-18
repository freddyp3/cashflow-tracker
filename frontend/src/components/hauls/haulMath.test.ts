import { formatHaulDate, summarize, withRunningBalance } from './haulMath';
import type { PersonalHaul } from '../../types';

const haul = (entryTime: string, flowType: string, amount: number, note: string | null = null): PersonalHaul => ({
  entryTime,
  flowType,
  amount,
  note,
});

describe('withRunningBalance', () => {
  it('sorts chronologically and accumulates income minus expenses', () => {
    const rows = withRunningBalance([
      haul('2025-01-03T00:00:00Z', 'expense', 30),
      haul('2025-01-01T00:00:00Z', 'income', 100),
      haul('2025-01-02T00:00:00Z', 'expense', 20),
    ]);
    expect(rows.map((r) => r.balance)).toEqual([100, 80, 50]);
  });
});

describe('summarize', () => {
  it('computes balance, income, expenses and count', () => {
    expect(
      summarize([
        haul('2025-01-01T00:00:00Z', 'income', 100),
        haul('2025-01-02T00:00:00Z', 'expense', 20),
        haul('2025-01-03T00:00:00Z', 'expense', 30),
      ]),
    ).toEqual({ balance: 50, income: 100, expenses: 50, count: 3 });
  });
});

describe('formatHaulDate', () => {
  it('formats as MMM d, yyyy', () => {
    expect(formatHaulDate('2025-01-05T12:00:00Z')).toBe('Jan 5, 2025');
  });
});
