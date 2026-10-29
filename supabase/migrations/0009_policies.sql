-- 0009 — Row-Level Security.
-- Read access is campus membership. Write access is a role check plus campus membership.
-- Anything the server must do on a user's behalf goes through a SECURITY DEFINER function
-- or the service-role client, so there is no write policy to abuse.

-- ---------------------------------------------------------------- campus-wide reads
do $$
declare t text;
begin
  foreach t in array array[
    'academic_years','holidays','departments','programs','batches','sections','subjects',
    'curriculum_items','fee_heads'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (campus_id = any (public.auth_campus_ids()))',
      t || '_read', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (campus_id = any (public.auth_campus_ids()) and public.auth_has_role(''CA'',''SA''))
         with check (campus_id = any (public.auth_campus_ids()) and public.auth_has_role(''CA'',''SA''))',
      t || '_write', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- campuses & identity
alter table campuses enable row level security;
create policy campuses_read on campuses for select to authenticated
  using (id = any (public.auth_campus_ids()));
create policy campuses_write on campuses for all to authenticated
  using (public.auth_has_role('SA')) with check (public.auth_has_role('SA'));

alter table groups enable row level security;
create policy groups_read on groups for select to authenticated
  using (id in (select group_id from campuses where id = any (public.auth_campus_ids())));
create policy groups_write on groups for all to authenticated
  using (public.auth_has_role('SA')) with check (public.auth_has_role('SA'));

alter table profiles enable row level security;
create policy profiles_self_read on profiles for select to authenticated
  using (
    id = auth.uid()
    or public.auth_has_role('CA','SA','HOD','FAC','ACC','AO','EXC','LIB','WAR','TRM')
  );
create policy profiles_self_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

alter table roles enable row level security;
create policy roles_read on roles for select to authenticated using (true);

alter table permissions enable row level security;
create policy permissions_read on permissions for select to authenticated using (true);

alter table role_permissions enable row level security;
create policy role_permissions_read on role_permissions for select to authenticated using (true);

alter table user_roles enable row level security;
create policy user_roles_read on user_roles for select to authenticated
  using (user_id = auth.uid() or public.auth_has_role('CA','SA'));
create policy user_roles_write on user_roles for all to authenticated
  using (public.auth_has_role('CA','SA')) with check (public.auth_has_role('CA','SA'));

alter table devices enable row level security;
create policy devices_read on devices for select to authenticated
  using (user_id = auth.uid() or public.auth_has_role('CA','SA'));

-- ---------------------------------------------------------------- students
alter table students enable row level security;

create policy students_read on students for select to authenticated
  using (
    campus_id = any (public.auth_campus_ids())
    and (
      public.auth_has_role('CA','SA','HOD','FAC','AO','EXC','ACC','LIB','WAR','TRM')
      or id = any (public.auth_student_ids())
    )
  );

create policy students_write on students for all to authenticated
  using (campus_id = any (public.auth_campus_ids()) and public.auth_has_role('CA','SA'))
  with check (campus_id = any (public.auth_campus_ids()) and public.auth_has_role('CA','SA'));

alter table guardians enable row level security;
create policy guardians_read on guardians for select to authenticated
  using (
    campus_id = any (public.auth_campus_ids())
    and (public.auth_has_role('CA','SA','FAC','HOD') or profile_id = auth.uid())
  );
create policy guardians_write on guardians for all to authenticated
  using (campus_id = any (public.auth_campus_ids()) and public.auth_has_role('CA','SA'))
  with check (campus_id = any (public.auth_campus_ids()) and public.auth_has_role('CA','SA'));

alter table student_guardians enable row level security;
create policy student_guardians_read on student_guardians for select to authenticated
  using (
    campus_id = any (public.auth_campus_ids())
    and (public.auth_has_role('CA','SA','FAC','HOD') or student_id = any (public.auth_student_ids()))
  );
create policy student_guardians_write on student_guardians for all to authenticated
  using (campus_id = any (public.auth_campus_ids()) and public.auth_has_role('CA','SA'))
  with check (campus_id = any (public.auth_campus_ids()) and public.auth_has_role('CA','SA'));

alter table enrollments enable row level security;
create policy enrollments_read on enrollments for select to authenticated
  using (
    campus_id = any (public.auth_campus_ids())
    and (public.auth_has_role('CA','SA','HOD','FAC','AO') or student_id = any (public.auth_student_ids()))
  );
create policy enrollments_write on enrollments for all to authenticated
  using (campus_id = any (public.auth_campus_ids()) and public.auth_has_role('CA','SA'))
  with check (campus_id = any (public.auth_campus_ids()) and public.auth_has_role('CA','SA'));

alter table student_documents enable row level security;
create policy student_documents_read on student_documents for select to authenticated
  using (
    campus_id = any (public.auth_campus_ids())
    and (public.auth_has_role('CA','SA','AO') or student_id = any (public.auth_student_ids()))
  );
create policy student_documents_write on student_documents for all to authenticated
  using (campus_id = any (public.auth_campus_ids()) and public.auth_has_role('CA','SA','AO'))
  with check (campus_id = any (public.auth_campus_ids()) and public.auth_has_role('CA','SA','AO'));

-- ---------------------------------------------------------------- attendance
alter table attendance_sessions enable row level security;
create policy attendance_sessions_read on attendance_sessions for select to authenticated
  using (campus_id = any (public.auth_campus_ids()));
create policy attendance_sessions_write on attendance_sessions for all to authenticated
  using (
    campus_id = any (public.auth_campus_ids())
    and (faculty_id = auth.uid() or public.auth_has_role('CA','SA'))
  )
  with check (
    campus_id = any (public.auth_campus_ids())
    and (faculty_id = auth.uid() or public.auth_has_role('CA','SA'))
  );

-- No insert policy: scans are written by the server with the service role, after
-- the token, geofence and device checks. A client cannot write a record directly.
alter table attendance_records enable row level security;
create policy attendance_records_read on attendance_records for select to authenticated
  using (
    campus_id = any (public.auth_campus_ids())
    and (
      public.auth_has_role('CA','SA','HOD','FAC')
      or student_id = any (public.auth_student_ids())
    )
  );

alter table attendance_scan_events enable row level security;
create policy scan_events_read on attendance_scan_events for select to authenticated
  using (
    campus_id = any (public.auth_campus_ids())
    and (public.auth_has_role('CA','SA','HOD','FAC') or student_id = any (public.auth_student_ids()))
  );

alter table student_leaves enable row level security;
create policy leaves_read on student_leaves for select to authenticated
  using (campus_id = any (public.auth_campus_ids())
         and (public.auth_has_role('CA','SA','HOD','FAC') or student_id = any (public.auth_student_ids())));
create policy leaves_write on student_leaves for all to authenticated
  using (campus_id = any (public.auth_campus_ids())
         and (student_id = any (public.auth_student_ids()) or public.auth_has_role('CA','SA','HOD','FAC')))
  with check (campus_id = any (public.auth_campus_ids())
         and (student_id = any (public.auth_student_ids()) or public.auth_has_role('CA','SA','HOD','FAC')));

alter table condonations enable row level security;
create policy condonations_read on condonations for select to authenticated
  using (campus_id = any (public.auth_campus_ids())
         and (public.auth_has_role('CA','SA','HOD') or student_id = any (public.auth_student_ids())));

-- ---------------------------------------------------------------- finance
-- Reads are scoped to the accountant, the campus admin and the student or ward.
-- All writes go through app_record_payment / app_create_invoice, so there is no
-- direct write policy on any finance table.
do $$
declare t text;
begin
  foreach t in array array['fee_invoices','payments','receipts','ledger_entries','concessions','refunds']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (campus_id = any (public.auth_campus_ids())
                and (public.auth_has_role(''ACC'',''CA'',''SA'')
                     or student_id = any (public.auth_student_ids())))',
      t || '_read', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- audit & internals
alter table audit_logs enable row level security;
create policy audit_logs_read on audit_logs for select to authenticated
  using (public.auth_has_role('CA','SA'));

-- No policies at all: reachable only by the service role and SECURITY DEFINER code.
alter table job_queue enable row level security;
alter table app_sequences enable row level security;
