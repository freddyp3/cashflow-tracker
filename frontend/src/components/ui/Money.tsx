export type Currency = 'CAD' | 'USD' | 'CNY';

const CURRENCY_PREFIX: Record<Currency, string> = {
  CAD: 'CA$',
  USD: 'US$',
  CNY: 'CN¥',
};

const numberFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// eslint-disable-next-line react-refresh/only-export-components
export function formatMoney(amount: number, currency: Currency = 'CAD'): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}${CURRENCY_PREFIX[currency]}${numberFormat.format(Math.abs(amount))}`;
}

export interface MoneyProps {
  amount: number;
  currency?: Currency;
  className?: string;
}

export default function Money({ amount, currency, className = '' }: MoneyProps) {
  return <span className={`tabular-nums ${className}`}>{formatMoney(amount, currency)}</span>;
}
