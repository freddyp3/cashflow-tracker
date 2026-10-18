/**
 * Shared filter bar for the Insights page: Country select plus a tab-specific
 * select (Product on the Products tab, Platform on the Platforms tab).
 * Options are passed in by the page (which owns the meta queries).
 */
import type { Product } from '../../types';
import type { Tab } from './insightsState';

interface Props {
  country: string;
  onCountryChange: (val: string) => void;
  tab: Tab;
  platform: string;
  onPlatformChange: (val: string) => void;
  product: number | null;
  onProductChange: (val: number | null) => void;
  platforms: string[];
  countries: string[];
  products: Product[];
}

const selectClass =
  'rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500';

export default function StatsFilters({
  country,
  onCountryChange,
  tab,
  platform,
  onPlatformChange,
  product,
  onProductChange,
  platforms,
  countries,
  products,
}: Props) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="insights-country" className="text-sm font-medium text-gray-600">Country:</label>
        <select
          id="insights-country"
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
          className={selectClass}
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      {tab === 'products' ? (
        <div className="flex items-center gap-2">
          <label htmlFor="insights-product" className="text-sm font-medium text-gray-600">Product:</label>
          <select
            id="insights-product"
            value={product ?? ''}
            onChange={(e) => onProductChange(e.target.value ? Number(e.target.value) : null)}
            className={selectClass}
          >
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.productId} value={p.productId}>{p.productName}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <label htmlFor="insights-platform" className="text-sm font-medium text-gray-600">Platform:</label>
          <select
            id="insights-platform"
            value={platform}
            onChange={(e) => onPlatformChange(e.target.value)}
            className={selectClass}
          >
            <option value="">All platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
