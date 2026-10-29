-- 0005 — students, guardians and enrollment history.

create table students (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references groups (id) on delete restrict,
  campus_id      uuid not null references campuses (id) on delete restrict,
  profile_id     uuid references profiles (id) on delete set null,
  reg_no         text not null,
  admission_no   text,
  first_name     text not null,
  last_name      text not null,
  dob            date,
  category       text,
  email          text,
  phone          text,
  program_id     uuid not null,
  batch_id       uuid,
  section_id     uuid,
  status         student_status not null default 'active',
  admission_year int not null,
  created_at     timestamptz not null default now(),
  -- registration numbers are unique per campus, not globally
  unique (campus_id, id),
  unique (campus_id, reg_no),
  foreign key (campus_id, program_id) references programs (campus_id, id) on delete restrict,
  foreign key (campus_id, batch_id) references batches (campus_id, id) on delete restrict,
  foreign key (campus_id, section_id) references sections (campus_id, id) on delete restrict
);
create index students_campus_status_idx on students (campus_id, status);
create index students_name_trgm_idx on students using gin (first_name gin_trgm_ops);

create table guardians (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups (id) on delete restrict,
  campus_id   uuid not null references campuses (id) on delete restrict,
  profile_id  uuid references profiles (id) on delete set null,
  name        text not null,
  phone       text,
  email       text,
  unique (campus_id, id)
);

create table student_guardians (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups (id) on delete restrict,
  campus_id   uuid not null references campuses (id) on delete restrict,
  student_id  uuid not null,
  guardian_id uuid not null,
  relation    text not null default 'parent',
  unique (student_id, guardian_id),
  foreign key (campus_id, student_id) references students (campus_id, id) on delete cascade,
  foreign key (campus_id, guardian_id) references guardians (campus_id, id) on delete cascade
);

-- Append-only: which section a student belonged to in which year. Never overwritten.
create table enrollments (
  id               uuid primary key default gen_random_uuid(),
  group_id         uuid not null references groups (id) on delete restrict,
  campus_id        uuid not null references campuses (id) on delete restrict,
  student_id       uuid not null,
  section_id       uuid not null,
  academic_year_id uuid not null,
  semester         int not null,
  status           text not null default 'active',
  created_at       timestamptz not null default now(),
  foreign key (campus_id, student_id) references students (campus_id, id) on delete restrict,
  foreign key (campus_id, section_id) references sections (campus_id, id) on delete restrict,
  foreign key (campus_id, academic_year_id) references academic_years (campus_id, id) on delete restrict
);

create table student_documents (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups (id) on delete restrict,
  campus_id   uuid not null references campuses (id) on delete restrict,
  student_id  uuid not null,
  kind        text not null,
  file_path   text not null,
  verified    boolean not null default false,
  created_at  timestamptz not null default now(),
  foreign key (campus_id, student_id) references students (campus_id, id) on delete cascade
);
