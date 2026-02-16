/**
 * API functions for personal haul cash flow tracking.
 * Maps to Spring Boot endpoints at `/api/personal-hauls`.
 */
import client from './client';
import type { PersonalHaul } from '../types';

/** GET /api/personal-hauls - Fetch all haul entries. */
export async function getPersonalHauls(): Promise<PersonalHaul[]> {
  const { data } = await client.get<PersonalHaul[]>('/personal-hauls');
  return data;
}

export async function createPersonalHaul(haul: { flowType: string; amount: number; note: string | null }): Promise<PersonalHaul> {
  const { data } = await client.post<PersonalHaul>('/personal-hauls', haul);
  return data;
}

export async function deletePersonalHaul(entryTime: string): Promise<void> {
  await client.delete('/personal-hauls', { params: { entryTime } });
}
