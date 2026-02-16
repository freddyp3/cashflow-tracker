/**
 * API function for fetching live currency exchange rates to CAD.
 * Used by the order form to convert foreign currency amounts before submission.
 */
import client from './client';

interface RateResponse {
  from: string;
  to: string;
  rate: number;
}

export async function getRate(from: string): Promise<number> {
  if (from === 'CAD') return 1;
  const { data } = await client.get<RateResponse>('/currency/rates', {
    params: { from },
  });
  return data.rate;
}
