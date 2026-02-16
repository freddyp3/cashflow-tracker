/**
 * API functions for analytics/stats endpoints.
 * Maps to Spring Boot endpoints at `/api/stats/*`.
 * All functions support optional country filtering.
 * Returns generic Row maps since view columns vary per endpoint.
 */
import client from './client';

/** Generic row type for stats view results (column names vary per view). */
type Row = Record<string, unknown>;

export async function getProductStats(country?: string): Promise<Row[]> {
  const { data } = await client.get<Row[]>('/stats/products', { params: { country } });
  return data;
}

export async function getPlatformStats(country?: string): Promise<Row[]> {
  const { data } = await client.get<Row[]>('/stats/platforms', { params: { country } });
  return data;
}

export async function getProductByPlatformStats(platform?: string, country?: string): Promise<Row[]> {
  const { data } = await client.get<Row[]>('/stats/products-by-platform', { params: { platform, country } });
  return data;
}

export async function getPlatformMonth(platform?: string, country?: string): Promise<Row[]> {
  const { data } = await client.get<Row[]>('/stats/platform-month', { params: { platform, country } });
  return data;
}

export async function getPlatformDay(platform?: string, country?: string): Promise<Row[]> {
  const { data } = await client.get<Row[]>('/stats/platform-day', { params: { platform, country } });
  return data;
}

export async function getOverallMonth(): Promise<Row[]> {
  const { data } = await client.get<Row[]>('/stats/overall-month');
  return data;
}

export async function getProductMonth(productId?: number, country?: string): Promise<Row[]> {
  const { data } = await client.get<Row[]>('/stats/product-month', { params: { productId, country } });
  return data;
}

export async function getProductDay(productId?: number, country?: string): Promise<Row[]> {
  const { data } = await client.get<Row[]>('/stats/product-day', { params: { productId, country } });
  return data;
}

export async function getProductByPlatformMonth(country?: string): Promise<Row[]> {
  const { data } = await client.get<Row[]>('/stats/product-by-platform-month', { params: { country } });
  return data;
}

export async function getProductByPlatformDay(country?: string): Promise<Row[]> {
  const { data } = await client.get<Row[]>('/stats/product-by-platform-day', { params: { country } });
  return data;
}
