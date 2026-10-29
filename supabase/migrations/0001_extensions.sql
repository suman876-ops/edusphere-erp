-- 0001 — extensions.
-- PostGIS is optional: enable it on the project if geo columns are wanted later.
create extension if not exists pgcrypto;      -- hmac() for QR tokens, gen_random_uuid()
create extension if not exists pg_trgm;       -- fuzzy search replaces Meilisearch
create extension if not exists btree_gist;    -- needed later for hostel bed exclusion
-- pg_cron and pg_net are enabled on the Supabase project, not from a migration.
