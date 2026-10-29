import { createClient } from '@/lib/supabase/server';
import { requireCampus } from './tenancy';
import { hasRole, type SessionUser } from './auth';
import type { createStudent, listStudentsQuery, updateStudent } from '@/lib/validation';
import type { z } from 'zod';

const ROW = `id, reg_no, admission_no, first_name, last_name, dob, category, email, phone,
  status, admission_year, program_id, batch_id, section_id,
  program:programs (id, code, name), section:sections (id, name, semester)`;

export async function listStudents(user: SessionUser, query: z.infer<typeof listStudentsQuery>) {
  const campus = await requireCampus(user);
  const supabase = await createClient();

  const from = (query.page - 1) * query.limit;
  let builder = supabase
    .from('students')
    .select(ROW, { count: 'exact' })
    .eq('campus_id', campus.id)
    .order('admission_year', { ascending: false })
    .order('reg_no')
    .range(from, from + query.limit - 1);

  if (query.status) builder = builder.eq('status', query.status);
  if (query.programId) builder = builder.eq('program_id', query.programId);
  if (query.sectionId) builder = builder.eq('section_id', query.sectionId);
  if (query.q) {
    const q = query.q.replace(/[%,]/g, '');
    builder = builder.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,reg_no.ilike.%${q}%,email.ilike.%${q}%`,
    );
  }

  const { data, error, count } = await builder;
  if (error) throw error;

  const total = count ?? 0;
  return {
    data: data ?? [],
    meta: { page: query.page, limit: query.limit, total, pages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

export async function getStudent(user: SessionUser, id: string) {
  const campus = await requireCampus(user);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('students')
    .select(`${ROW}, fee_invoices (id, number, term, head, due_date, amount_paise, status)`)
    .eq('campus_id', campus.id)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error('Student not found in this campus'), { code: 'P0002' });
  return data;
}

export async function createStudentRow(
  user: SessionUser,
  input: z.infer<typeof createStudent>,
) {
  if (!hasRole(user, 'CA', 'SA')) {
    throw Object.assign(new Error('Requires role: CA, SA'), { code: '42501' });
  }
  const campus = await requireCampus(user);
  if (!user.groupId) throw Object.assign(new Error('User has no group scope'), { code: '42501' });
  const supabase = await createClient();

  const { data: program } = await supabase
    .from('programs').select('id').eq('id', input.programId).eq('campus_id', campus.id).maybeSingle();
  if (!program) throw new Error('programId does not belong to this campus');

  const { data: section } = await supabase
    .from('sections').select('id, batch_id').eq('id', input.sectionId).eq('campus_id', campus.id).maybeSingle();
  if (!section) throw new Error('sectionId does not belong to this campus');

  const { data, error } = await supabase
    .from('students')
    .insert({
      group_id: user.groupId,
      campus_id: campus.id,
      reg_no: input.regNo,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email?.toLowerCase(),
      phone: input.phone,
      program_id: input.programId,
      batch_id: section.batch_id,
      section_id: input.sectionId,
      admission_year: input.admissionYear,
    })
    .select(ROW)
    .single();
  if (error) throw error;
  return data;
}

export async function updateStudentRow(
  user: SessionUser,
  id: string,
  input: z.infer<typeof updateStudent>,
) {
  if (!hasRole(user, 'CA', 'SA')) {
    throw Object.assign(new Error('Requires role: CA, SA'), { code: '42501' });
  }
  const campus = await requireCampus(user);
  const supabase = await createClient();

  const patch: Record<string, unknown> = {};
  if (input.firstName !== undefined) patch.first_name = input.firstName;
  if (input.lastName !== undefined) patch.last_name = input.lastName;
  if (input.email !== undefined) patch.email = input.email.toLowerCase();
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.status !== undefined) patch.status = input.status;

  const { data, error } = await supabase
    .from('students')
    .update(patch)
    .eq('id', id)
    .eq('campus_id', campus.id)
    .select(ROW)
    .single();
  if (error) throw error;
  return data;
}
