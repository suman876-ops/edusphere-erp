# EduSphere — Multi-Campus College ERP (MVP slice)

A working vertical slice of the EduSphere spec: multi-tenant (Group -> Campus) ERP core with
JWT auth + role scopes, student records, session-based attendance with **rotating QR + geofence**
anti-proxy checks, and fee invoicing with counter payments. Built as a monorepo:

```
apps/api   NestJS 10 + Prisma + PostgreSQL 16 (REST, /v1)
apps/web   Next.js 15 App Router + Tailwind (admin console)
docs/      architecture, API reference, roadmap
```

## What actually works in this slice

| Area | Status |
| --- | --- |
| Login (JWT), role guards, campus scoping via `X-Campus-Id` | working |
| Group Super Admin can switch campus; campus users are hard-scoped | working |
| Students list (search, filter, paginate), create, detail, update | working |
| Attendance sessions (manual / QR / QR+geofence), HMAC rotating QR token, scan endpoint | working |
| Subject-wise attendance % + shortage flag (<75%) | working |
| Fee invoices, counter payment, receipt numbers, ledger, outstanding | working |
| Audit trail on mutating requests | working |
| Dashboard KPIs | working |
| Timetable solver, LMS, hostel, transport, exams, library | **not in this slice** — see `docs/roadmap.md` |

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build -d
docker compose exec api npx prisma db push
docker compose exec api npm run db:seed
```

Open http://localhost:3000 and log in with one of the seeded accounts below.

## Quick start (local)

```bash
# 1. database (any Postgres 15/16)
createdb edusphere

# 2. api
cd apps/api
npm install
cp .env.example .env          # point DATABASE_URL at your db
npx prisma db push
npm run db:seed
npm run start:dev             # http://localhost:4000/v1

# 3. web (new terminal)
cd apps/web
npm install
API_URL=http://127.0.0.1:4000/v1 npm run dev   # http://localhost:3000
```

## Tests

`npm run smoke` (inside `apps/api`) drives the running API end to end: auth, tenant isolation,
student CRUD, rotating-QR scans, expired/tampered tokens, geofence rejection, fee payments,
overpayment rejection, audit trail. It prints `36 checks passed, 0 failed` on a healthy build.

## Seeded accounts

| Email | Password | Role | Scope |
| --- | --- | --- | --- |
| `superadmin@edusphere.app` | `Passw0rd!` | SA | all campuses |
| `admin.kol@edusphere.app` | `Passw0rd!` | CA | Kolkata campus |
| `hod.cse.kol@edusphere.app` | `Passw0rd!` | HOD | Kolkata campus, CSE |
| `faculty.rao@edusphere.app` | `Passw0rd!` | FAC | Kolkata campus |
| `accountant.kol@edusphere.app` | `Passw0rd!` | ACC | Kolkata campus |
| `student.1@edusphere.app` | `Passw0rd!` | STU | Kolkata campus |
| `admin.dgp@edusphere.app` | `Passw0rd!` | CA | Durgapur campus |

## Tenant model

Hierarchy implemented in this slice: **Group -> Campus -> Department -> Program -> Section**.
Every row carries `campusId`; the API derives the campus from the JWT and the optional
`X-Campus-Id` header (Super Admin only). Postgres Row-Level Security policies are documented in
`docs/architecture.md` and can be layered on top without changing module code.

## Anti-proxy attendance

A session stores a `qrSecret`. The QR token is `HMAC-SHA256(secret, sessionId + step)` truncated to
12 hex chars and prefixed with the step in base36. `step = floor(now / 20s)`, so the code rotates
every 20 seconds and a screenshot is worthless after ~40s. In `QR_GEOFENCE` mode the scan must also
arrive within the session radius (haversine check) and a duplicate device id is flagged.

## Scripts

```bash
# apps/api
npm run start:dev     # watch mode
npm run build         # tsc -> dist
npm run db:push       # prisma db push
npm run db:seed       # seed demo data
npm run smoke         # 36 end-to-end checks against a running API

# apps/web
npm run dev
npm run build
```

## License

MIT.
