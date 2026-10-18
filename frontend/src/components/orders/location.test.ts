import { formatLocation, parseLocation } from './location';

describe('parseLocation', () => {
  it('returns empty parts for TBD, null and blank', () => {
    for (const s of ['TBD', null, undefined, '', '   ']) {
      expect(parseLocation(s)).toEqual({ city: '', region: '', country: '' });
    }
  });

  it('parses a single country segment by name or code', () => {
    expect(parseLocation('Canada')).toEqual({ city: '', region: '', country: 'CAN' });
    expect(parseLocation('CAN')).toEqual({ city: '', region: '', country: 'CAN' });
  });

  it('parses a single non-country segment as a city', () => {
    expect(parseLocation('Toronto')).toEqual({ city: 'Toronto', region: '', country: '' });
  });

  it('parses two segments as city + country', () => {
    expect(parseLocation('Alliston, CAN')).toEqual({ city: 'Alliston', region: '', country: 'CAN' });
  });

  it('parses three+ segments as city + region + country', () => {
    expect(parseLocation('Toronto, ON, CAN')).toEqual({ city: 'Toronto', region: 'ON', country: 'CAN' });
    expect(parseLocation('Geneva, N/A, CHE')).toEqual({ city: 'Geneva', region: 'N/A', country: 'CHE' });
    expect(parseLocation('Springfield, MA, USA')).toEqual({ city: 'Springfield', region: 'MA', country: 'USA' });
  });

  it('keeps an unresolved trailing segment as the raw country value', () => {
    expect(parseLocation('Nowhere, ZZ, XXX')).toEqual({ city: 'Nowhere', region: 'ZZ', country: 'XXX' });
  });
});

describe('formatLocation', () => {
  it('joins non-empty parts', () => {
    expect(formatLocation({ city: 'Toronto', region: 'ON', country: 'CAN' })).toBe('Toronto, ON, CAN');
    expect(formatLocation({ city: 'Alliston', region: '', country: 'CAN' })).toBe('Alliston, CAN');
    expect(formatLocation({ city: '', region: '', country: 'CAN' })).toBe('CAN');
  });

  it('returns TBD when all parts are empty', () => {
    expect(formatLocation({ city: '', region: '', country: '' })).toBe('TBD');
  });

  it('round-trips parsed locations', () => {
    expect(formatLocation(parseLocation('Toronto, ON, CAN'))).toBe('Toronto, ON, CAN');
    expect(formatLocation(parseLocation('Canada'))).toBe('CAN');
    expect(formatLocation(parseLocation('TBD'))).toBe('TBD');
  });
});
