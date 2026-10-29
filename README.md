# EduSphere — Multi-Campus College ERP

Next.js 15 (App Router) + TypeScript + Tailwind on **Supabase** (Postgres, Auth, Storage,
Realtime). Multi-tenant from the first migration: Group → Campus → Department → Programme →
Batch → Section, with Row-Level Security on every tenant table.

> **Status: Phase 1 — the Supabase foundation.** The database layer is complete for the
> current slice (tenancy, IAM, academic structure, students, attendance, fees). The 25
> endpoints that existed in the old NestJS API now run as route handlers under
> `/api/v1`, with the same paths and the same response envelopes. Modules that the
> specification requires but that are not built yet are listed in `docs/roadmap.md`.

## What is in this repository

```
supabase/
  migrations/       10 versioned SQL migrations — the only source of schema truth
  seed.sql          idempotent: five institutions (inactive) + one flagged demo campus
apps/web/
  app/api/v1/…      17 route handlers (25 operations) — parity with the old API
  app/(console)/…   six console screens (unchanged markup)
  server/…          domain logic: auth, tenancy, students, attendance, fees, reports, audit
  lib/supabase/     three clients: browser, server (RLS as the user), admin (service role)
  lib/validation.ts Zod schemas shared by client and server
  components/       existing primitives + a real, scannable QR panel
tests/rls/          the cross-campus isolation matrix
scripts/seed-demo.mjs
```

## Quick start

```bash
# 1. dependencies
cd apps/web && npm install

# 2. local Supabase stack (Docker required)
supabase start

# 3. schema + seed, from migrations only
supabase db reset          # applies supabase/migrations/*.sql then supabase/seed.sql

# 4. demo accounts and one demo student (service role needed)
export NEXT_PUBLIC_SUPABASE_URL=$(supabase status -o env | grep API_URL | cut -d= -f2- | tr -d '"')
export SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o env | grep SERVICE_ROLE_KEY | cut -d= -f2- | tr -d '"')
node scripts/seed-demo.mjs

# 5. run
cp ../../.env.example .env.local   # fill in the three values
npm run dev                        # http://localhost:3000
```

Demo sign-ins (password `Passw0rd!Passw0rd!`): `superadmin@edusphere.app`,
`admin.demo@edusphere.app`, `faculty.demo@edusphere.app`, `accountant.demo@edusphere.app`,
`student.demo@edusphere.app`.

## Deploying to a live URL

The app needs a Supabase project and a Next.js host. Both are one-time, five-minute steps
that require your accounts — they cannot be done from a commit.

1. **Create the Supabase project** (Pro tier recommended: realtime connections, storage and
   read replicas all have free-tier limits). Note the project ref.
2. **Push the schema**: `supabase link --project-ref <ref>` then `supabase db push`. This
   applies all ten migrations in order. Then run `seed.sql` from the SQL editor.
3. **Enable the token hook**: Dashboard → Authentication → Hooks → *Custom access token* →
   `public.custom_access_token_hook`. Without this the `campus_ids` and `roles` claims are
   absent and RLS will return nothing — the app will look empty, not broken.
4. **Deploy the web app**: import this repository into Vercel, set the root directory to
   `apps/web`, and add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_SITE_URL` (the deployed URL) and `SUPABASE_SERVICE_ROLE_KEY`.
5. **Run the demo seed** against the hosted project once, then create your first real
   campus admin from the Supabase dashboard.

## Security model

- **RLS is the boundary**, not the route guard. Every tenant table has a policy keyed on
  `campus_id = any (auth_campus_ids())`, where the array comes from a signed JWT claim.
- **Composite tenant keys**: every parent table has `unique (campus_id, id)` and children
  reference `(campus_id, parent_id)`, so a cross-campus link fails at the constraint.
- **Money** is invoice-driven with an append-only ledger; balances are derived. Receipt and
  invoice numbers come from an atomic per-campus sequence, not `count() + 1`.
- **The service-role key** is confined to the demo seed, gateway webhooks and the attendance
  scan write. CI greps the client bundle for it and fails the build if it appears.
- **Attendance scans** are verified in this order: token window, enrollment, device binding,
  geofence distance, duplicate device. Every attempt leaves a row in
  `attendance_scan_events`, so a disputed flag can be re-examined.

## Scripts

```bash
npm run dev        # next dev
npm run build      # next build
npm run typecheck  # tsc --noEmit
npm test           # vitest
```

## Not built yet

Admissions, timetable and the CP-SAT solver, exams and results, LMS, library, hostel,
transport, communication, certificates, helpdesk, reports and the parent portal. Each has
tables reserved in the migration plan and a phase in `docs/roadmap.md`. No screen in this
repository links to a feature that does not exist.

## License

MIT.
