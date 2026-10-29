-- 0008 — helper functions, triggers and the transactional money/QR operations.
-- Supabase runs Postgres 15/17, so uuidv7() does not exist natively; we ship one.

create or replace function public.uuid_generate_v7()
returns uuid
language sql
volatile
as $$
  select encode(
    set_bit(
      set_bit(
        overlay(
          uuid_send(gen_random_uuid())
          placing substring(int8send((extract(epoch from clock_timestamp()) * 1000)::bigint) from 3) from 1 for 6
        ), 52, 1
      ), 53, 1
    ), 'hex'
  )::uuid;
$$;

-- ---------------------------------------------------------------- claim helpers

create or replace function public.auth_campus_ids()
returns uuid[]
language sql stable security definer set search_path = public, auth
as $$
  select coalesce(
    array(select jsonb_array_elements_text(coalesce(auth.jwt() -> 'campus_ids', '[]'::jsonb)))::uuid[],
    '{}'::uuid[]
  );
$$;

create or replace function public.auth_has_role(variadic p_roles text[])
returns boolean
language sql stable security definer set search_path = public, auth
as $$
  select coalesce(
    array(select jsonb_array_elements_text(coalesce(auth.jwt() -> 'roles', '[]'::jsonb))) && p_roles,
    false
  );
$$;

-- The caller's own student row plus any ward they are a guardian of.
create or replace function public.auth_student_ids()
returns uuid[]
language sql stable security definer set search_path = public, auth
as $$
  select coalesce(array(
    select s.id from students s where s.profile_id = auth.uid()
    union
    select sg.student_id
      from student_guardians sg
      join guardians g on g.id = sg.guardian_id
     where g.profile_id = auth.uid()
  ), '{}'::uuid[]);
$$;

-- Injects campus_ids, roles and group_id into the JWT. Wired up in config.toml.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_user   uuid := (event ->> 'user_id')::uuid;
  v_claims jsonb;
  v_roles  text[];
  v_campus uuid[];
  v_group  uuid;
begin
  select coalesce(array_agg(distinct r.key::text), '{}')
    into v_roles
    from user_roles ur join roles r on r.id = ur.role_id
   where ur.user_id = v_user;

  select ur.group_id into v_group
    from user_roles ur where ur.user_id = v_user limit 1;

  if 'SA' = any (v_roles) then
    -- a group super admin sees every campus in their group
    select coalesce(array_agg(c.id), '{}') into v_campus
      from campuses c where c.group_id = v_group;
  else
    select coalesce(array_agg(distinct ur.campus_id), '{}') into v_campus
      from user_roles ur
     where ur.user_id = v_user and ur.campus_id is not null;
  end if;

  v_claims := coalesce(event -> 'claims', '{}'::jsonb) || jsonb_build_object(
    'campus_ids', to_jsonb(v_campus),
    'roles', to_jsonb(v_roles),
    'group_id', v_group
  );
  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

-- ---------------------------------------------------------------- audit trail

create or replace function public.audit_row()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_row jsonb;
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;

  insert into audit_logs (group_id, campus_id, actor_id, action, entity, entity_id, before, after)
  values (
    (v_row ->> 'group_id')::uuid,
    (v_row ->> 'campus_id')::uuid,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    (v_row ->> 'id')::uuid,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return null;
end;
$$;

-- audit_logs and ledger_entries are append-only.
create or replace function public.forbid_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '42501';
end;
$$;

-- ---------------------------------------------------------------- numbering

-- Atomic gapless counter. Replaces the old count() + 1, which raced.
create or replace function public.app_next_seq(p_campus uuid, p_key text)
returns int
language plpgsql security definer set search_path = public
as $$
declare v_no int;
begin
  insert into app_sequences (campus_id, key, last_no)
  values (p_campus, p_key, 1)
  on conflict (campus_id, key) do update set last_no = app_sequences.last_no + 1
  returning last_no into v_no;
  return v_no;
end;
$$;

create or replace function public.app_financial_year(p_at date default current_date)
returns text
language sql immutable
as $$
  select case
    when extract(month from p_at) >= 4
      then extract(year from p_at)::int::text || '-' || lpad(((extract(year from p_at)::int + 1) % 100)::text, 2, '0')
      else (extract(year from p_at)::int - 1)::text || '-' || lpad((extract(year from p_at)::int % 100)::text, 2, '0')
  end;
$$;

-- ---------------------------------------------------------------- rotating QR

-- Faculty-only: returns the token for the current (or given) 20-second window.
create or replace function public.app_qr_token(p_session uuid, p_step int default null)
returns text
language plpgsql stable security definer set search_path = public
as $$
declare
  v_secret  text;
  v_faculty uuid;
  v_step    int;
begin
  select qr_secret, faculty_id into v_secret, v_faculty
    from attendance_sessions where id = p_session;
  if v_secret is null then
    raise exception 'session not found' using errcode = 'P0002';
  end if;
  -- students must never be able to mint a token for themselves
  if not (auth_has_role('CA', 'SA') or v_faculty = auth.uid()) then
    raise exception 'not permitted to read this session token' using errcode = '42501';
  end if;

  v_step := coalesce(p_step, floor(extract(epoch from clock_timestamp()) * 1000 / 20000)::int);
  return v_step::text || '.' ||
         substr(encode(hmac(p_session::text || ':' || v_step::text, v_secret, 'sha256'), 'hex'), 1, 16);
end;
$$;

-- Student-callable: returns a verdict only, never the secret.
create or replace function public.app_verify_qr(p_session uuid, p_token text, p_tolerance int default 1)
returns text
language plpgsql stable security definer set search_path = public
as $$
declare
  v_secret   text;
  v_step     int;
  v_now      int;
  v_expected text;
begin
  select qr_secret into v_secret from attendance_sessions where id = p_session;
  if v_secret is null then return 'unknown_session'; end if;
  if p_token is null or position('.' in p_token) = 0 then return 'malformed'; end if;

  begin
    v_step := split_part(p_token, '.', 1)::int;
  exception when others then
    return 'malformed';
  end;

  v_now := floor(extract(epoch from clock_timestamp()) * 1000 / 20000)::int;
  if abs(v_now - v_step) > p_tolerance then return 'expired'; end if;

  v_expected := v_step::text || '.' ||
    substr(encode(hmac(p_session::text || ':' || v_step::text, v_secret, 'sha256'), 'hex'), 1, 16);
  if v_expected <> p_token then return 'invalid'; end if;
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------- money

-- One transaction: allocate the receipt number, write the payment, write the
-- ledger pair, and recompute the invoice status from what has actually been paid.
create or replace function public.app_record_payment(
  p_invoice  uuid,
  p_amount   int,
  p_method   payment_method,
  p_reference text default null
)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_inv    fee_invoices%rowtype;
  v_paid   int;
  v_fy     text;
  v_seq    int;
  v_code   text;
  v_receipt text;
  v_payment uuid;
  v_status invoice_status;
begin
  if not (auth_has_role('ACC', 'CA', 'SA') or auth.uid() is null) then
    raise exception 'only the accounts desk or a campus admin may record a payment'
      using errcode = '42501';
  end if;

  select * into v_inv from fee_invoices where id = p_invoice for update;
  if not found then raise exception 'invoice not found' using errcode = 'P0002'; end if;
  if v_inv.status = 'void' then raise exception 'invoice is void'; end if;
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;

  select coalesce(sum(amount_paise), 0) into v_paid
    from payments where invoice_id = p_invoice and status = 'captured';

  if v_paid + p_amount > v_inv.amount_paise then
    raise exception 'payment exceeds outstanding balance'
      using errcode = '23514',
            hint = format('outstanding is %s paise', v_inv.amount_paise - v_paid);
  end if;

  insert into payments (group_id, campus_id, student_id, invoice_id, amount_paise, method, reference)
  values (v_inv.group_id, v_inv.campus_id, v_inv.student_id, v_inv.id, p_amount, p_method, p_reference)
  returning id into v_payment;

  v_fy := app_financial_year();
  select code into v_code from campuses where id = v_inv.campus_id;
  v_seq := app_next_seq(v_inv.campus_id, 'RCPT/' || v_fy);
  v_receipt := 'RCPT/' || v_code || '/' || v_fy || '/' || lpad(v_seq::text, 6, '0');

  insert into receipts (group_id, campus_id, financial_year, receipt_no, payment_id)
  values (v_inv.group_id, v_inv.campus_id, v_fy, v_receipt, v_payment);

  insert into ledger_entries (group_id, campus_id, student_id, account, debit_paise, credit_paise, ref_type, ref_id)
  values
    (v_inv.group_id, v_inv.campus_id, v_inv.student_id, 'cash', p_amount, 0, 'payment', v_payment),
    (v_inv.group_id, v_inv.campus_id, v_inv.student_id, 'fee_receivable', 0, p_amount, 'payment', v_payment);

  v_status := case
    when v_paid + p_amount >= v_inv.amount_paise then 'paid'::invoice_status
    else 'partial'::invoice_status
  end;

  update fee_invoices set status = v_status where id = v_inv.id;

  return json_build_object(
    'payment_id', v_payment,
    'receipt_no', v_receipt,
    'invoice_status', v_status,
    'paid_paise', v_paid + p_amount,
    'outstanding_paise', v_inv.amount_paise - v_paid - p_amount
  );
end;
$$;

create or replace function public.app_create_invoice(
  p_student uuid,
  p_term    text,
  p_head    text,
  p_due     date,
  p_amount  int
)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_student students%rowtype;
  v_fy      text;
  v_seq     int;
  v_number  text;
  v_id      uuid;
begin
  if not (auth_has_role('ACC', 'CA', 'SA') or auth.uid() is null) then
    raise exception 'only the accounts desk or a campus admin may raise an invoice'
      using errcode = '42501';
  end if;

  select * into v_student from students where id = p_student;
  if not found then raise exception 'student not found' using errcode = 'P0002'; end if;

  v_fy := app_financial_year();
  v_seq := app_next_seq(v_student.campus_id, 'INV/' || v_fy);
  v_number := 'INV/' || v_fy || '/' || lpad(v_seq::text, 5, '0');

  insert into fee_invoices (group_id, campus_id, student_id, number, term, head, due_date, amount_paise)
  values (v_student.group_id, v_student.campus_id, p_student, v_number, p_term, p_head, p_due, p_amount)
  returning id into v_id;

  insert into ledger_entries (group_id, campus_id, student_id, account, debit_paise, credit_paise, ref_type, ref_id)
  values
    (v_student.group_id, v_student.campus_id, p_student, 'fee_receivable', p_amount, 0, 'invoice', v_id),
    (v_student.group_id, v_student.campus_id, p_student, 'fee_income', 0, p_amount, 'invoice', v_id);

  return json_build_object('invoice_id', v_id, 'number', v_number);
end;
$$;

-- ---------------------------------------------------------------- wiring

revoke all on function public.app_qr_token(uuid, int) from public, anon;
grant execute on function public.app_qr_token(uuid, int) to authenticated;
revoke all on function public.app_verify_qr(uuid, text, int) from public, anon;
grant execute on function public.app_verify_qr(uuid, text, int) to authenticated;
revoke all on function public.app_record_payment(uuid, int, payment_method, text) from public, anon;
grant execute on function public.app_record_payment(uuid, int, payment_method, text) to authenticated;
revoke all on function public.app_create_invoice(uuid, text, text, date, int) from public, anon;
grant execute on function public.app_create_invoice(uuid, text, text, date, int) to authenticated;

revoke update, delete on public.audit_logs from authenticated, anon;
revoke update, delete on public.ledger_entries from authenticated, anon;

create trigger audit_logs_append_only before update or delete on audit_logs
  for each row execute function forbid_mutation();
create trigger ledger_entries_append_only before update or delete on ledger_entries
  for each row execute function forbid_mutation();

create trigger students_audit after insert or update or delete on students
  for each row execute function audit_row();
create trigger invoices_audit after insert or update on fee_invoices
  for each row execute function audit_row();
create trigger payments_audit after insert on payments
  for each row execute function audit_row();
create trigger sessions_audit after insert or update on attendance_sessions
  for each row execute function audit_row();
create trigger user_roles_audit after insert or update or delete on user_roles
  for each row execute function audit_row();
