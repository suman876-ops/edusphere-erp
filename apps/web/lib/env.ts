import { z } from 'zod';

/**
 * Environment validation. Fails loudly and early with a list of missing *names* —
 * never values — so a misconfigured deploy says what to fix instead of throwing
 * "cannot read property of undefined" three screens later.
 *
 * NEXT_PUBLIC_* values are referenced literally so Next can inline them at build time.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('must be a full URL, e.g. https://<ref>.supabase.co'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, 'looks too short for a Supabase anon key'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
});

const serverSchema = z.object({
  // optional: only the attendance scan, webhooks and the demo seed need it
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

let cachedPublic: PublicEnv | null = null;

function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `  · ${i.path.join('.')}: ${i.message}`).join('\n');
}

export function publicEnv(): PublicEnv {
  if (cachedPublic) return cachedPublic;

  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid or missing public environment variables:\n${formatIssues(parsed.error)}\n` +
        'Copy .env.example to .env.local and fill in the values.',
    );
  }

  cachedPublic = parsed.data;
  return cachedPublic;
}

/** Server-only. Throws only when called, so a build without the key still succeeds. */
export function serverEnv(): ServerEnv {
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!parsed.success) {
    throw new Error(`Invalid server environment variables:\n${formatIssues(parsed.error)}`);
  }
  return parsed.data;
}

/** True when the service-role key is configured. Used to degrade features, not to leak it. */
export function hasServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
