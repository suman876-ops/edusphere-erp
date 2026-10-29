import { createClient } from '@/lib/supabase/server';
import { requireCampus } from './tenancy';
import { hasRole, type SessionUser } from './auth';

export async function listAudit(user: SessionUser, limit = 50) {
  if (!hasRole(user, 'CA', 'SA')) {
    throw Object.assign(new Error('Requires role: CA, SA'), { code: '42501' });
  }
  const campus = await requireCampus(user);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, entity, entity_id, actor_id, before, after, created_at')
    .eq('campus_id', campus.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
