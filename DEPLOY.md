# Deploying EduSphere to Vercel

The app is a Next.js 15 App Router project in `apps/web`. The database is already
provisioned on Supabase, so this guide is only about the web tier.

## What you need before you start

| Value | Where to get it |
| --- | --- |
| Project URL | Supabase → Project Settings → API → Project URL |
| Anon key | Supabase → Project Settings → API → `anon` / `public` |
| Service role key | Same page, `service_role` — **server only, never `NEXT_PUBLIC_`** |

## 1. Import the repository

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Authorise Vercel to read `suman876-ops/edusphere-erp`.
3. Choose **Import** on that repository.

## 2. Set the root directory — this is the step people miss

The repository is a monorepo: the Next.js app is in `apps/web`, and `apps/api` is the
old NestJS service. Vercel will otherwise try to build the repository root and fail.

On the import screen, set **Root Directory** to `apps/web`. Vercel then detects
Next.js automatically; leave the build command and output directory alone.

## 3. Add the environment variables

Still on the import screen, expand **Environment Variables** and add all four. Apply
each to Production, Preview and Development.

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the `anon` key |
| `NEXT_PUBLIC_SITE_URL` | your deployment URL, e.g. `https://edusphere-erp.vercel.app` |
| `SUPABASE_SERVICE_ROLE_KEY` | the `service_role` key — mark it server-only |

`NEXT_PUBLIC_SITE_URL` must match the real deployment URL, because the server-side
`api()` helper uses it to call the app's own route handlers. You can add it after the
first deploy, when Vercel tells you the domain, then redeploy.

## 4. Deploy

Press **Deploy**. The first build takes about two minutes.

## 5. Enable the custom access token hook — do not skip this

Supabase → **Authentication** → **Hooks** → *Custom access token* → select
`public.custom_access_token_hook` → Enable.

Every RLS policy reads a `campus_ids` claim that this hook injects. Without it the app
builds, loads, and shows **an empty dashboard with no error** — the most confusing
failure mode in the project. If a page is blank, check this first.

## 6. Create your first user

1. Supabase → **Authentication** → **Users** → **Add user**. Set an email and password,
   and tick *Auto confirm*.
2. Then run this in the SQL editor, replacing the email:

```sql
-- profile row (the app reads the display name from here)
insert into profiles (id, full_name, email)
select id, 'Campus Admin', email from auth.users where email = 'you@example.com'
on conflict (id) do update set full_name = excluded.full_name;

-- campus-admin role on the DEMO campus
insert into user_roles (group_id, campus_id, user_id, role_id, scope_type, scope_id)
select '00000000-0000-0000-0000-000000000001', c.id, u.id, r.id, 'campus', c.id
from auth.users u, campuses c, roles r
where u.email = 'you@example.com'
  and r.key = 'CA'
  and c.code = 'DEMO'
on conflict do nothing;
```

3. Sign in at `https://<your-url>/login`. **Sign out and back in** after assigning the
   role — the claims are baked into the JWT, so an existing session will not see the new
   campus until the token refreshes.

## Troubleshooting

**`npm ci can only install packages when your package.json and package-lock.json are in sync`**
The lockfile is stale. Run `npm install` inside `apps/web` locally and commit the
regenerated `package-lock.json`.

**Build succeeds, pages are empty, no error shown**
The access token hook is not enabled (step 5), so `auth_campus_ids()` returns an empty
array and every policy returns zero rows. Confirm with:

```sql
select auth_campus_ids();   -- as the signed-in user, should list the DEMO campus id
```

**`SUPABASE_SERVICE_ROLE_KEY is not set`**
Add it to Vercel and redeploy. It is only needed by the attendance scan and the demo
seed, but the module is imported at build time.

**Login returns "Invalid email or password"**
The user was created without *Auto confirm*, or the password is under the minimum
length. Reset it from Authentication → Users.

**Everything 500s after a schema change**
Run `supabase db push` against the project; the deployed app expects the schema in
`supabase/migrations`.

## Local run against the same database

```bash
cd apps/web
npm install
cp ../../.env.example .env.local   # fill in the four values
npm run dev
```
