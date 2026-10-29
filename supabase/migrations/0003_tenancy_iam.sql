-- 0003 — tenancy and identity.
-- Every tenant table carries group_id and campus_id, and every parent table exposes
-- unique (campus_id, id) so children reference (campus_id, parent_id). A cross-campus
-- link is then impossible at the constraint level, not merely discouraged in code.

create table groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table campuses (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups (id) on delete restrict,
  code        text not null,
  name        text not null,
  city        text,
  timezone    text not null default 'Asia/Kolkata',
  domain      text,
  settings    jsonb not null default '{}'::jsonb,
  status      campus_status not null default 'pending_approval',
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (group_id, code)
);
create index campuses_group_idx on campuses (group_id);

create table academic_years (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups (id) on delete restrict,
  campus_id   uuid not null references campuses (id) on delete restrict,
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  is_current  boolean not null default false,
  unique (campus_id, id),
  unique (campus_id, name)
);

create table holidays (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups (id) on delete restrict,
  campus_id   uuid not null references campuses (id) on delete restrict,
  on_date     date not null,
  name        text not null,
  unique (campus_id, on_date)
);

-- One row per human login. auth.users holds the credential; this holds the profile.
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  email       text,
  phone       text,
  created_at  timestamptz not null default now()
);

create table roles (
  id          uuid primary key default gen_random_uuid(),
  key         role_key not null unique,
  name        text not null
);

create table permissions (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique
);

create table role_permissions (
  role_id        uuid not null references roles (id) on delete cascade,
  permission_id  uuid not null references permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

-- Replaces the single role enum: a person may hold several roles at several scopes.
create table user_roles (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups (id) on delete restrict,
  campus_id   uuid references campuses (id) on delete restrict,
  user_id     uuid not null references profiles (id) on delete cascade,
  role_id     uuid not null references roles (id) on delete restrict,
  scope_type  scope_type not null default 'campus',
  scope_id    uuid,
  created_at  timestamptz not null default now()
);
create index user_roles_user_idx on user_roles (user_id);
create index user_roles_campus_idx on user_roles (campus_id);

create table devices (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups (id) on delete restrict,
  campus_id   uuid not null references campuses (id) on delete restrict,
  user_id     uuid not null references profiles (id) on delete cascade,
  device_id   text not null,
  bound_at    timestamptz not null default now(),
  unique (user_id, device_id)
);

-- Append-only. Written by trigger; the app role cannot update or delete.
create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid,
  campus_id   uuid,
  actor_id    uuid,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_lookup_idx on audit_logs (campus_id, entity, created_at desc);

create table job_queue (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups (id) on delete restrict,
  campus_id   uuid not null references campuses (id) on delete restrict,
  kind        text not null,
  payload     jsonb not null default '{}'::jsonb,
  status      job_status not null default 'queued',
  run_at      timestamptz not null default now(),
  attempts    int not null default 0,
  last_error  text,
  created_at  timestamptz not null default now()
);
create index job_queue_pending_idx on job_queue (status, run_at);

-- Gapless numbering per campus and financial year: invoices and receipts.
create table app_sequences (
  campus_id  uuid not null references campuses (id) on delete restrict,
  key        text not null,
  last_no    int not null default 0,
  primary key (campus_id, key)
);
