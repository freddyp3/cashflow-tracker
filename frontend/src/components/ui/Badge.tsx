import type { ReactNode } from 'react';

export type BadgeTone = 'amber' | 'gray' | 'green' | 'red';

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const toneClasses: Record<BadgeTone, string> = {
  amber: 'bg-amber-100 text-amber-700',
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
};

export default function Badge({ tone = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-block px-1.5 py-0.5 text-xs font-semibold rounded ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
