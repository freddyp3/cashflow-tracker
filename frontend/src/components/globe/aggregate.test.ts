import { aggregateDestinations, pointRadius, summarize } from './aggregate';
import type { Order } from '../../types';

const order = (over: Partial<Order>): Order => ({
  orderId: 1,
  platform: 'Grailed',
  shipping: 10,
  revenue: 100,
  refunded: 0,
  refundedUsed: 0,
  customerName: 'Test',
  shippingLocation: 'Toronto, ON, CAN',
  latitude: 43.65,
  longitude: -79.38,
  disputed: false,
  draft: false,
  orderDate: '2025-01-01',
  deliveredDate: null,
  note: null,
  items: [],
  ...over,
});

describe('aggregateDestinations', () => {
  it('filters disputed, TBD/blank locations and null coordinates', () => {
    const dests = aggregateDestinations([
      order({ disputed: true }),
      order({ shippingLocation: 'TBD' }),
      order({ shippingLocation: '   ' }),
      order({ latitude: null }),
      order({ longitude: null }),
      order({}),
    ]);
    expect(dests).toHaveLength(1);
    expect(dests[0].location).toBe('Toronto, ON, CAN');
  });

  it('groups duplicate locations and sums revenue', () => {
    const dests = aggregateDestinations([
      order({ revenue: 100 }),
      order({ revenue: 50 }),
      order({ shippingLocation: 'New York, NY, USA', latitude: 40.71, longitude: -74.0 }),
    ]);
    const toronto = dests.find((d) => d.location === 'Toronto, ON, CAN');
    expect(toronto).toMatchObject({ orders: 2, revenue: 150, lat: 43.65, lng: -79.38 });
    expect(dests).toHaveLength(2);
  });

  it('extracts country from the last segment or the whole string', () => {
    const dests = aggregateDestinations([
      order({ shippingLocation: 'Geneva, N/A, CHE' }),
      order({ shippingLocation: 'Canada' }),
    ]);
    expect(dests.find((d) => d.location === 'Geneva, N/A, CHE')?.country).toBe('CHE');
    expect(dests.find((d) => d.location === 'Canada')?.country).toBe('Canada');
  });

  it('sorts by orders desc then location asc', () => {
    const dests = aggregateDestinations([
      order({ shippingLocation: 'Bville, B, CAN' }),
      order({ shippingLocation: 'Aville, A, CAN' }),
      order({ shippingLocation: 'Aville, A, CAN' }),
      order({ shippingLocation: 'Cville, C, CAN' }),
    ]);
    expect(dests.map((d) => d.location)).toEqual([
      'Aville, A, CAN',
      'Bville, B, CAN',
      'Cville, C, CAN',
    ]);
  });
});

describe('summarize', () => {
  it('counts distinct countries, destinations, orders and top N', () => {
    const dests = aggregateDestinations([
      order({}),
      order({ shippingLocation: 'Alliston, ON, CAN' }),
      order({ shippingLocation: 'New York, NY, USA', latitude: 40.71, longitude: -74 }),
      order({ shippingLocation: 'New York, NY, USA', latitude: 40.71, longitude: -74 }),
    ]);
    const s = summarize(dests);
    expect(s).toMatchObject({ countries: 2, cities: 3, orders: 4 });
    expect(s.top).toHaveLength(3);
    expect(summarize(dests, 1).top).toHaveLength(1);
  });
});

describe('pointRadius', () => {
  it('grows with order count and caps at 0.9', () => {
    expect(pointRadius(1)).toBeLessThan(pointRadius(4));
    expect(pointRadius(1000)).toBe(0.9);
  });
});
