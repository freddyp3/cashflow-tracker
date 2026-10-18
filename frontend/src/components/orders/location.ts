import { countryByCode, countryByName } from '../../data/countries';

/** Structured parts of a `"City, Region, CODE"` shipping location. */
export interface LocationParts {
  city: string;
  region: string;
  /** Alpha-3 code when the segment resolves to a country, else the raw segment. */
  country: string;
}

function resolveCountry(segment: string): string {
  const found = countryByCode(segment) ?? countryByName(segment);
  return found ? found.code : segment;
}

/**
 * Parses a free-form shipping location. `'TBD'`/empty → all-empty parts.
 * 1 segment → country if it resolves by code or name, else city. 2 segments →
 * city + country. 3+ → first is city, last is country, middle joined as region.
 */
export function parseLocation(s: string | null | undefined): LocationParts {
  const empty: LocationParts = { city: '', region: '', country: '' };
  const trimmed = (s ?? '').trim();
  if (!trimmed || trimmed === 'TBD') return empty;

  const segments = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  if (segments.length === 1) {
    const seg = segments[0];
    if (countryByCode(seg) ?? countryByName(seg)) {
      return { ...empty, country: resolveCountry(seg) };
    }
    return { ...empty, city: seg };
  }
  if (segments.length === 2) {
    return { ...empty, city: segments[0], country: resolveCountry(segments[1]) };
  }
  return {
    city: segments[0],
    region: segments.slice(1, -1).join(', '),
    country: resolveCountry(segments[segments.length - 1]),
  };
}

/** Joins non-empty parts as `"City, Region, CODE"`; all empty → `'TBD'`. */
export function formatLocation(p: LocationParts): string {
  const joined = [p.city, p.region, p.country].filter((x) => x.trim() !== '').join(', ');
  return joined || 'TBD';
}
