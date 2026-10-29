import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { SessionUser } from './auth';

export type Campus = { id: string; code: string; name: string; is_demo: boolean };

export async function campusesForUser(user: SessionUser): Promise<Campus[]> {
  if (user.campusIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('campuses')
    .select('id, code, name, is_demo')
    .in('id', user.campusIds)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

/**
 * The campus a request acts on. Group staff pick one; everyone else has exactly
 * one. The value is validated against the signed claim, so a tampered cookie
 * cannot widen scope — it can only fail.
 */
export async function getActiveCampus(user: SessionUser): Promise<Campus | null> {
  const campuses = await campusesForUser(user);
  if (campuses.length === 0) return null;
  const store = await cookies();
  const selected = store.get('es_campus')?.value;
  return campuses.find((c) => c.id === selected) ?? campuses[0];
}

export async function requireCampus(user: SessionUser): Promise<Campus> {
  const campus = await getActiveCampus(user);
  if (!campus) {
    throw Object.assign(new Error('No campus scope for this user'), { code: '42501' });
  }
  return campus;
}
