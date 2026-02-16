/**
 * Filter dropdowns for stats pages. Fetches available countries and platforms
 * from the /api/meta endpoints. Country filter is always shown; platform filter
 * is conditionally shown via the `showPlatform` prop.
 */
import { useQuery } from '@tanstack/react-query';
import { getPlatforms, getCountries } from '../../api/meta';

interface Props {
  country: string;
  onCountryChange: (val: string) => void;
  platform?: string;
  onPlatformChange?: (val: string) => void;
  showPlatform?: boolean;
}

export default function StatsFilters({ country, onCountryChange, platform, onPlatformChange, showPlatform }: Props) {
  const { data: countries = [] } = useQuery({ queryKey: ['meta-countries'], queryFn: getCountries });
  const { data: platforms = [] } = useQuery({ queryKey: ['meta-platforms'], queryFn: getPlatforms });

  const selectClass = 'rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500';

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600">Country:</label>
        <select value={country} onChange={(e) => onCountryChange(e.target.value)} className={selectClass}>
          <option value="">All</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      {showPlatform && onPlatformChange && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Platform:</label>
          <select value={platform} onChange={(e) => onPlatformChange(e.target.value)} className={selectClass}>
            <option value="">All</option>
            {platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
