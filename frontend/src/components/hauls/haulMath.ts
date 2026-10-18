/** Balance math for personal haul cash-flow entries. */
import type { PersonalHaul } from '../../types';

/** Chronological entries each annotated with the running balance after it. */
export function withRunningBalance(hauls: PersonalHaul[]): Array<PersonalHaul & { balance: number }> {
  const sorted = [...hauls].sort(
    (a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime(),
  );
  let balance = 0;
  return sorted.map((h) => {
    balance += h.flowType === 'income' ? h.amount : -h.amount;
    return { ...h, balance };
  });
}

export function summarize(hauls: PersonalHaul[]): {
  balance: number;
  income: number;
  expenses: number;
  count: number;
} {
  let income = 0;
  let expenses = 0;
  for (const h of hauls) {
    if (h.flowType === 'income') income += h.amount;
    else expenses += h.amount;
  }
  return { balance: income - expenses, income, expenses, count: hauls.length };
}

/** 'Jan 5, 2025' */
export function formatHaulDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
