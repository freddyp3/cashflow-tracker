import type { Order } from '../../types';

/** Vancouver origin point for shipment arcs. */
export const VANCOUVER = { lat: 49.28, lng: -123.12 };

export interface Destination {
  location: string;
  country: string;
  lat: number;
  lng: number;
  orders: number;
  revenue: number;
}

export interface GlobeSummary {
  countries: number;
  cities: number;
  orders: number;
  top: Destination[];
}

/**
 * Groups orders by exact shippingLocation into destinations. Keeps only
 * non-disputed orders with a real location (not TBD/blank) and non-null
 * coordinates. Country is the last comma-separated segment (or the whole
 * string when there is no comma). Sorted by order count desc, location asc.
 */
export function aggregateDestinations(orders: Order[]): Destination[] {
  const byLocation = new Map<string, Destination>();
  for (const order of orders) {
    if (order.disputed) continue;
    const location = order.shippingLocation?.trim();
    if (!location || location === 'TBD') continue;
    if (order.latitude == null || order.longitude == null) continue;

    const segments = location.split(',');
    const country = segments[segments.length - 1].trim();
    const existing = byLocation.get(location);
    if (existing) {
      existing.orders += 1;
      existing.revenue += order.revenue;
    } else {
      byLocation.set(location, {
        location,
        country,
        lat: order.latitude,
        lng: order.longitude,
        orders: 1,
        revenue: order.revenue,
      });
    }
  }
  return [...byLocation.values()].sort(
    (a, b) => b.orders - a.orders || a.location.localeCompare(b.location),
  );
}

/** Counts distinct countries, destinations, orders, and the top-N destinations. */
export function summarize(dests: Destination[], topN = 5): GlobeSummary {
  return {
    countries: new Set(dests.map((d) => d.country)).size,
    cities: dests.length,
    orders: dests.reduce((sum, d) => sum + d.orders, 0),
    top: dests.slice(0, topN),
  };
}

/** Point radius grows with sqrt(order count), capped at 0.9. */
export function pointRadius(orders: number): number {
  return Math.min(0.9, 0.25 + 0.12 * Math.sqrt(orders));
}
