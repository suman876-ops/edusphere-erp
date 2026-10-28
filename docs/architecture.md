# Architecture — MVP slice

## Runtime

```
Browser (Next.js 15, RSC + server actions)
        |  fetch + httpOnly cookie (JWT)
        v
NestJS API  /v1   -- global AuthGuard -> role check -> campus scope
        |
        +-- Prisma 5 --> PostgreSQL 16
        +-- AuditInterceptor --> audit_logs
```

## Tenancy

1. `POST /v1/auth/login` returns a JWT whose payload is
   `{ sub, email, role, campusId, name }`.
2. Every request passes through the global `AuthGuard`. It verifies the JWT, then resolves the
   effective campus:
   - `SA` (Group Super Admin): `X-Campus-Id` header if present, otherwise all campuses (`null`).
   - everyone else: the campus baked into the token. Sending a different `X-Campus-Id` is a
     `403 Campus scope violation`.
3. Controllers never read the header themselves; they take `@CampusCtx()` which is either a
   `campusId` string or `null` (group-wide). Repository filters are built with a small helper
   (`whereCampus`) so a missing scope fails closed.
4. Role checks use `@Roles('CA', 'ACC')` + `RolesGuard` metadata read by the same guard.

### Row-Level Security (next step, not required for the slice)

```sql
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY campus_isolation ON students
  USING (campus_id = current_setting('app.campus_id', true)::uuid);
```

Set `app.campus_id` per transaction from the request scope. The Prisma client can be wrapped with
`$extends` to run `SET LOCAL app.campus_id` before each query batch.

## Attendance token

```
step      = floor(epoch_ms / 20000)
token     = base36(step) + "." + hmac_sha256(qrSecret, sessionId + ":" + step)[0:12]
```

`POST /attendance/sessions/:id/scan` accepts `step - 1 .. step + 1` (40s of clock drift) and
rejects everything else with `400 QR code expired`. Geofence mode compares the scan coordinates
with the session centre using haversine distance and the configured radius.

## Money

Invoices and payments are stored in integer paise (`amount`, `paidAmount`, `amount`). Payment
creation runs in a `$transaction`: insert `fee_payments`, increment `fee_invoices.paidAmount`,
recompute `status` (`UNPAID -> PARTIAL -> PAID`), and write an audit row. Receipt numbers are
sequential per campus per financial year (`RCPT/KOL/2026-27/000123`).

## Error shape

```json
{ "statusCode": 400, "message": "QR code expired", "error": "Bad Request" }
```

## Not implemented here

Timetable CP-SAT solver, BullMQ workers, Socket.IO live counters, Meilisearch, S3 uploads, gateway
webhooks/reconciliation, PDF rendering, mobile app. Interfaces for these are sketched in
`docs/roadmap.md` with the module boundaries they slot into.
