#!/usr/bin/env node
/**
 * Creates the demo accounts and demo records inside the DEMO campus only.
 * Idempotent: users are looked up before creation, and inserts use upserts.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * Run after `supabase db reset` (which applies supabase/seed.sql).
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const DEMO_CAMPUS = '00000000-0000-0000-0000-0000000000d1';
const GROUP = '00000000-0000-0000-0000-000000000001';
const SECTION = '00000000-0000-0000-0000-000000000121';
const PROGRAM = '00000000-0000-0000-0000-000000000101';
const BATCH = '00000000-0000-0000-0000-000000000111';
const PASSWORD = 'Passw0rd!Passw0rd!';

const PEOPLE = [
  { email: 'superadmin@edusphere.app', name: 'Group Super Admin', role: 'SA', campus: null },
  { email: 'admin.demo@edusphere.app', name: 'Demo Campus Admin', role: 'CA', campus: DEMO_CAMPUS },
  { email: 'faculty.demo@edusphere.app', name: 'Dr. Anil Rao', role: 'FAC', campus: DEMO_CAMPUS },
  { email: 'accountant.demo@edusphere.app', name: 'Accounts Desk', role: 'ACC', campus: DEMO_CAMPUS },
  { email: 'student.demo@edusphere.app', name: 'Riya Sen', role: 'STU', campus: DEMO_CAMPUS },
];

async function ensureUser(person) {
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users?.find((u) => u.email === person.email);
  if (existing) return existing.id;

  const { data, error } = await db.auth.admin.createUser({
    email: person.email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  const roles = await db.from('roles').select('id, key');
  if (roles.error) throw roles.error;
  const roleId = Object.fromEntries(roles.data.map((r) => [r.key, r.id]));

  for (const person of PEOPLE) {
    const userId = await ensureUser(person);

    await db.from('profiles').upsert(
      { id: userId, full_name: person.name, email: person.email },
      { onConflict: 'id' },
    );

    const { data: existing } = await db
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role_id', roleId[person.role])
      .maybeSingle();

    if (!existing) {
      await db.from('user_roles').insert({
        group_id: GROUP,
        campus_id: person.campus,
        user_id: userId,
        role_id: roleId[person.role],
        scope_type: person.campus ? 'campus' : 'group',
        scope_id: person.campus,
      });
    }
  }

  // one demo student, linked to the student account
  const studentUser = await ensureUser(PEOPLE[4]);
  await db.from('students').upsert(
    {
      group_id: GROUP,
      campus_id: DEMO_CAMPUS,
      profile_id: studentUser,
      reg_no: 'DEMO/2025/001',
      first_name: 'Riya',
      last_name: 'Sen',
      email: 'student.demo@edusphere.app',
      program_id: PROGRAM,
      batch_id: BATCH,
      section_id: SECTION,
      admission_year: 2025,
    },
    { onConflict: 'campus_id,reg_no' },
  );

  console.log('demo data ready — sign in with student.demo@edusphere.app /', PASSWORD);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
