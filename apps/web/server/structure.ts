import { createClient } from '@/lib/supabase/server';
import { requireCampus } from './tenancy';
import type { SessionUser } from './auth';

export type StructureKind = 'programs' | 'sections' | 'subjects' | 'departments' | 'batches';

const SELECT: Record<StructureKind, string> = {
  programs: 'id, code, name, level, duration_yrs, department_id',
  sections: 'id, name, semester, program_id, batch_id',
  subjects: 'id, code, title, credits, semester',
  departments: 'id, code, name',
  batches: 'id, name, intake_year, program_id',
};

export async function listStructure(user: SessionUser, kind: StructureKind) {
  const campus = await requireCampus(user);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(kind)
    .select(SELECT[kind])
    .eq('campus_id', campus.id)
    .order(kind === 'sections' ? 'name' : 'code');
  if (error) throw error;
  return data ?? [];
}
