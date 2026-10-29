-- EduSphere seed — idempotent by design.
-- Re-running this file changes nothing. There is no delete statement anywhere:
-- the brief forbids destructive seeds and forbids inventing college records.
--
-- Five institutions are stored as unapproved tenants with their public names only.
-- No students, staff, fees or departments are invented for them. Every demo record
-- lives in the DEMO campus, flagged is_demo, and is created by scripts/seed-demo.ts.

insert into groups (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'EduSphere Group')
on conflict (id) do update set name = excluded.name;

insert into roles (key, name) values
  ('SA','Group Super Admin'), ('CA','Campus Admin'), ('AO','Admission Officer'),
  ('HOD','Head of Department'), ('FAC','Faculty'), ('EXC','Exam Controller'),
  ('ACC','Accountant / Cashier'), ('LIB','Librarian'), ('WAR','Hostel Warden'),
  ('TRM','Transport Manager'), ('STU','Student'), ('PAR','Parent'), ('APP','Applicant')
on conflict (key) do update set name = excluded.name;

insert into permissions (key) values
  ('students.read'), ('students.write'), ('attendance.mark'), ('attendance.scan'),
  ('fees.invoice.create'), ('fees.receipt.create'), ('fees.refund.approve'),
  ('marks.enter'), ('marks.approve'), ('results.publish'), ('audit.read'), ('roles.manage')
on conflict (key) do nothing;

-- Five institutions, inactive until an authorised administrator approves them.
-- Website URLs are deliberately absent: they must be captured from each
-- institution's own site and recorded with the date they were checked.
insert into campuses (id, group_id, code, name, city, status, is_demo) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000001',
   'MIDCITY', 'Midnapore City College', 'Midnapore', 'pending_approval', false),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000001',
   'MIDCOL', 'Midnapore College (Autonomous)', 'Midnapore', 'pending_approval', false),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000001',
   'RNKWC', 'Raja Narendralal Khan Women''s College (Autonomous)', 'Midnapore', 'pending_approval', false),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000001',
   'KDCOL', 'K.D. College of Commerce & General Studies', 'Midnapore', 'pending_approval', false),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-000000000001',
   'VU', 'Vidyasagar University', 'Midnapore', 'pending_approval', false)
on conflict (group_id, code) do update set name = excluded.name, status = excluded.status;

-- The sandbox. All invented records live here and nowhere else.
insert into campuses (id, group_id, code, name, city, status, is_demo) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000001',
   'DEMO', 'Development Sandbox', 'Midnapore', 'active', true)
on conflict (group_id, code) do update set name = excluded.name, status = excluded.status;

insert into academic_years (id, group_id, campus_id, name, start_date, end_date, is_current) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000d1', '2026-27', '2026-06-01', '2027-05-31', true)
on conflict (campus_id, name) do update set is_current = excluded.is_current;

insert into departments (id, group_id, campus_id, name, code) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000d1', 'Computer Science & Engineering', 'CSE')
on conflict (campus_id, code) do update set name = excluded.name;

insert into programs (id, group_id, campus_id, department_id, name, code, level, duration_yrs) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1',
   'B.Tech Computer Science', 'BTECH-CSE', 'UG', 4)
on conflict (campus_id, code) do update set name = excluded.name;

insert into batches (id, group_id, campus_id, program_id, intake_year, name) values
  ('00000000-0000-0000-0000-000000000111', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000101', 2025, '2025 intake')
on conflict (campus_id, program_id, intake_year) do update set name = excluded.name;

insert into sections (id, group_id, campus_id, program_id, batch_id, name, semester) values
  ('00000000-0000-0000-0000-000000000121', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000101',
   '00000000-0000-0000-0000-000000000111', 'CSE-A', 3)
on conflict (campus_id, batch_id, name) do update set semester = excluded.semester;

insert into subjects (id, group_id, campus_id, code, title, credits, semester) values
  ('00000000-0000-0000-0000-000000000131', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000d1', 'CSE301', 'Data Structures', 4, 3),
  ('00000000-0000-0000-0000-000000000132', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000d1', 'CSE302', 'Operating Systems', 4, 3),
  ('00000000-0000-0000-0000-000000000133', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000d1', 'CSE303', 'Database Systems', 3, 3),
  ('00000000-0000-0000-0000-000000000134', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000d1', 'CSE304', 'Computer Networks', 3, 3)
on conflict (campus_id, code) do update set title = excluded.title;

insert into curriculum_items (group_id, campus_id, program_id, semester, subject_id) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1',
   '00000000-0000-0000-0000-000000000101', 3, '00000000-0000-0000-0000-000000000131'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1',
   '00000000-0000-0000-0000-000000000101', 3, '00000000-0000-0000-0000-000000000132'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1',
   '00000000-0000-0000-0000-000000000101', 3, '00000000-0000-0000-0000-000000000133'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1',
   '00000000-0000-0000-0000-000000000101', 3, '00000000-0000-0000-0000-000000000134')
on conflict (campus_id, program_id, semester, subject_id) do nothing;

insert into fee_heads (group_id, campus_id, code, name) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'TUITION', 'Tuition'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'LAB', 'Laboratory'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'BUS', 'Transport')
on conflict (campus_id, code) do nothing;
