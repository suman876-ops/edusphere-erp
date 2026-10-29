-- 0002 — enums, named to match the specification so later phases never rename one.

create type role_key as enum (
  'SA','CA','AO','HOD','FAC','EXC','ACC','LIB','WAR','TRM','STU','PAR','APP'
);

create type scope_type as enum ('group','campus','department','section','self');

create type campus_status as enum ('active','inactive','pending_approval');

create type student_status as enum ('active','dropped','alumni','suspended');

create type attendance_status as enum ('P','A','L','OD');

create type attendance_mode as enum ('manual','qr','qr_geo');

create type session_status as enum ('open','closed');

create type invoice_status as enum ('unpaid','partial','paid','void');

create type payment_method as enum ('cash','upi','card','netbanking','cheque','dd','gateway');

create type payment_status as enum ('created','captured','failed','refunded');

create type job_status as enum ('queued','running','done','failed');
