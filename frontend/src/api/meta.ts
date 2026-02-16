/**
 * API functions for metadata used by filter dropdowns (platforms, countries).
 * Maps to Spring Boot endpoints at `/api/meta`.
 */
import client from './client';

/** GET /api/meta/platforms - Distinct platform names for dropdown filters. */
export async function getPlatforms(): Promise<string[]> {
  const { data } = await client.get<string[]>('/meta/platforms');
  return data;
}

export async function getCountries(): Promise<string[]> {
  const { data } = await client.get<string[]>('/meta/countries');
  return data;
}
