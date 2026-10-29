-- 0007 — invoice-driven finance with an append-only ledger.
-- Balances are derived from payments and ledger_entries; nothing stores a mutable balance.

create table fee_heads (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups (id) on delete restrict,
  campus_id   uuid not null references campuses (id) on delete restrict,
  code        text not null,
  name        text not null,
  unique (campus_id, code)
);

create table fee_invoices (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references groups (id) on delete restrict,
  campus_id     uuid not null references campuses (id) on delete restrict,
  student_id    uuid not null,
  number        text not null,
  term          text not null,
  head          text not null default 'Tuition',
  due_date      date not null,
  amount_paise  int not null check (amount_paise > 0),
  status        invoice_status not null default 'unpaid',
  created_at    timestamptz not null default now(),
  unique (campus_id, id),
  unique (campus_id, number),
  foreign key (campus_id, student_id) references students (campus_id, id) on delete restrict
);
create index fee_invoices_student_idx on fee_invoices (student_id, status, due_date);

create table payments (
  id                 uuid primary key default gen_random_uuid(),
  group_id           uuid not null references groups (id) on delete restrict,
  campus_id          uuid not null references campuses (id) on delete restrict,
  student_id         uuid not null,
  invoice_id         uuid not null,
  amount_paise       int not null check (amount_paise > 0),
  method             payment_method not null default 'cash',
  reference          text,
  gateway            text,
  gateway_payment_id text,
  status             payment_status not null default 'captured',
  paid_at            timestamptz not null default now(),
  unique (campus_id, id),
  foreign key (campus_id, invoice_id) references fee_invoices (campus_id, id) on delete restrict,
  foreign key (campus_id, student_id) references students (campus_id, id) on delete restrict
);
-- Idempotent webhooks: a gateway payment id may be stored once.
create unique index payments_gateway_unique on payments (gateway, gateway_payment_id)
  where gateway_payment_id is not null;
create index payments_invoice_idx on payments (invoice_id);

create table receipts (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references groups (id) on delete restrict,
  campus_id      uuid not null references campuses (id) on delete restrict,
  financial_year text not null,
  receipt_no     text not null,
  payment_id     uuid not null,
  created_at     timestamptz not null default now(),
  unique (campus_id, financial_year, receipt_no),
  foreign key (campus_id, payment_id) references payments (campus_id, id) on delete restrict
);

-- Append-only double-entry ledger. No updates, no deletes, ever.
create table ledger_entries (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references groups (id) on delete restrict,
  campus_id    uuid not null references campuses (id) on delete restrict,
  student_id   uuid,
  account      text not null,
  debit_paise  int not null default 0,
  credit_paise int not null default 0,
  ref_type     text not null,
  ref_id       uuid,
  created_at   timestamptz not null default now(),
  constraint ledger_one_side check (
    (debit_paise > 0 and credit_paise = 0) or (credit_paise > 0 and debit_paise = 0)
  )
);
create index ledger_student_idx on ledger_entries (student_id, created_at);

create table concessions (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups (id) on delete restrict,
  campus_id   uuid not null references campuses (id) on delete restrict,
  student_id  uuid not null,
  kind        text not null default 'concession',
  amount_paise int not null check (amount_paise > 0),
  status      text not null default 'pending',
  approved_by uuid references profiles (id),
  created_at  timestamptz not null default now(),
  foreign key (campus_id, student_id) references students (campus_id, id) on delete restrict
);

create table refunds (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups (id) on delete restrict,
  campus_id   uuid not null references campuses (id) on delete restrict,
  payment_id  uuid not null,
  amount_paise int not null check (amount_paise > 0),
  status      text not null default 'requested',
  reason      text,
  created_at  timestamptz not null default now(),
  foreign key (campus_id, payment_id) references payments (campus_id, id) on delete restrict
);
