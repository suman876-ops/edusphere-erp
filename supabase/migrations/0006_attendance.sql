-- 0006 — session-based attendance with retained scan evidence.

create table attendance_sessions (
  id               uuid primary key default gen_random_uuid(),
  group_id         uuid not null references groups (id) on delete restrict,
  campus_id        uuid not null references campuses (id) on delete restrict,
  subject_id       uuid not null,
  section_id       uuid not null,
  faculty_id       uuid not null references profiles (id) on delete restrict,
  academic_year_id uuid,
  on_date          date not null default current_date,
  mode             attendance_mode not null default 'qr',
  status           session_status not null default 'open',
  qr_secret        text not null default encode(gen_random_bytes(32), 'hex'),
  lat              double precision,
  lng              double precision,
  radius_m         int not null default 150,
  opened_at        timestamptz not null default now(),
  closed_at        timestamptz,
  unique (campus_id, id),
  foreign key (campus_id, subject_id) references subjects (campus_id, id) on delete restrict,
  foreign key (campus_id, section_id) references sections (campus_id, id) on delete restrict,
  foreign key (campus_id, academic_year_id) references academic_years (campus_id, id) on delete restrict,
  constraint qr_geo_needs_centre check (mode <> 'qr_geo' or (lat is not null and lng is not null))
);
create index attendance_sessions_campus_date_idx on attendance_sessions (campus_id, on_date desc);

create table attendance_records (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups (id) on delete restrict,
  campus_id   uuid not null references campuses (id) on delete restrict,
  session_id  uuid not null,
  student_id  uuid not null,
  status      attendance_status not null default 'P',
  source      text not null default 'qr',
  marked_at   timestamptz not null default now(),
  lat         double precision,
  lng         double precision,
  device_id   text,
  suspicious  boolean not null default false,
  unique (session_id, student_id),
  foreign key (campus_id, session_id) references attendance_sessions (campus_id, id) on delete cascade,
  foreign key (campus_id, student_id) references students (campus_id, id) on delete restrict
);
create index attendance_records_student_idx on attendance_records (student_id, marked_at desc);

-- Raw evidence, kept so a disputed scan can be re-examined.
create table attendance_scan_events (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups (id) on delete restrict,
  campus_id   uuid not null references campuses (id) on delete restrict,
  session_id  uuid not null,
  student_id  uuid not null,
  device_id   text,
  lat         double precision,
  lng         double precision,
  accuracy_m  double precision,
  distance_m  double precision,
  verdict     text not null,
  reason      text,
  created_at  timestamptz not null default now(),
  foreign key (campus_id, session_id) references attendance_sessions (campus_id, id) on delete cascade,
  foreign key (campus_id, student_id) references students (campus_id, id) on delete cascade
);
create index scan_events_session_idx on attendance_scan_events (session_id, created_at desc);

create table student_leaves (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups (id) on delete restrict,
  campus_id   uuid not null references campuses (id) on delete restrict,
  student_id  uuid not null,
  from_date   date not null,
  to_date     date not null,
  reason      text,
  status      text not null default 'pending',
  created_at  timestamptz not null default now(),
  foreign key (campus_id, student_id) references students (campus_id, id) on delete cascade
);

create table condonations (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups (id) on delete restrict,
  campus_id   uuid not null references campuses (id) on delete restrict,
  student_id  uuid not null,
  subject_id  uuid,
  reason      text,
  status      text not null default 'pending',
  created_at  timestamptz not null default now(),
  foreign key (campus_id, student_id) references students (campus_id, id) on delete cascade
);
