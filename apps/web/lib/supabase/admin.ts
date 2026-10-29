import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client. Bypasses RLS, so it is confined to the few server-only
 * places that need it: the demo seed, gateway webhooks, and the attendance scan
 * write (which must happen after the token, geofence and device checks).
 *
 * NEVER import this from a client component. CI greps the built bundle for the
 * key and fails the build if it appears.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
