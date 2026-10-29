-- 0004 — academic structure: department -> programme -> batch -> section, plus subjects.

create table departments (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups (id) on delete restrict,
  campus_id   uuid not null references campuses (id) on delete restrict,
  name        text not null,
  code        text not null,
  unique (campus_id, id),
  unique (campus_id, code)
);

create table programs (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references groups (id) on delete restrict,
  campus_id      uuid not null references campuses (id) on delete restrict,
  department_id  uuid not null,
  name           text not null,
  code           text not null,
  level          text not null default 'UG',
  duration_yrs   int not null default 4,
  unique (campus_id, id),
  unique (campus_id, code),
  foreign key (campus_id, department_id) references departments (campus_id, id) on delete restrict
);

create table batches (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references groups (id) on delete restrict,
  campus_id    uuid not null references campuses (id) on delete restrict,
  program_id   uuid not null,
  intake_year  int not null,
  name         text not null,
  unique (campus_id, id),
  unique (campus_id, program_id, intake_year),
  foreign key (campus_id, program_id) references programs (campus_id, id) on delete restrict
);

create table sections (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references groups (id) on delete restrict,
  campus_id    uuid not null references campuses (id) on delete restrict,
  program_id   uuid not null,
  batch_id     uuid not null,
  name         text not null,
  semester     int not null default 1,
  unique (campus_id, id),
  unique (campus_id, batch_id, name),
  foreign key (campus_id, program_id) references programs (campus_id, id) on delete restrict,
  foreign key (campus_id, batch_id) references batches (campus_id, id) on delete restrict
);

create table subjects (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups (id) on delete restrict,
  campus_id   uuid not null references campuses (id) on delete restrict,
  code        text not null,
  title       text not null,
  credits     int not null default 3,
  semester    int not null default 1,
  unique (campus_id, id),
  unique (campus_id, code)
);

create table curriculum_items (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references groups (id) on delete restrict,
  campus_id    uuid not null references campuses (id) on delete restrict,
  program_id   uuid not null,
  semester     int not null,
  subject_id   uuid not null,
  unique (campus_id, program_id, semester, subject_id),
  foreign key (campus_id, program_id) references programs (campus_id, id) on delete restrict,
  foreign key (campus_id, subject_id) references subjects (campus_id, id) on delete restrict
);
