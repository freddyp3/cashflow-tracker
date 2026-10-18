import { useState } from 'react';
import ShippingGlobe from '../components/globe/ShippingGlobe';
import type { GlobeSummary } from '../components/globe/aggregate';
import { Money } from '../components/ui';

const plural = (n: number, singular: string, pluralForm?: string) =>
  `${n} ${n === 1 ? singular : pluralForm ?? `${singular}s`}`;

export default function GlobePage() {
  const [summary, setSummary] = useState<GlobeSummary | null>(null);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">My Shipping Adventures</h1>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <ShippingGlobe onReady={setSummary} />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-sm text-gray-500">
            {summary
              ? `${plural(summary.countries, 'country', 'countries')} · ${plural(summary.cities, 'city', 'cities')} · ${plural(summary.orders, 'order')}`
              : '—'}
          </p>
          <h2 className="text-sm font-semibold text-gray-900 mt-4 mb-2">Top destinations</h2>
          {summary ? (
            <ol>
              {summary.top.map((d) => (
                <li key={d.location} className="flex justify-between gap-3 text-sm">
                  <span className="text-gray-700 truncate" title={d.location}>{d.location}</span>
                  <span className="shrink-0">
                    <Money amount={d.revenue} />
                    <span className="text-gray-500"> · {d.orders}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-gray-500">—</p>
          )}
        </div>
      </div>
    </div>
  );
}
