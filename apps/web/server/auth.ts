import { createClient } from '@/lib/supabase/server';

export type SessionUser = {
  id: string;
  email: string | null;
  fullName: string;
  roles: string[];
  campusIds: string[];
  groupId: string | null;
};

type Claims = {
  sub?: string;
  email?: string;
  roles?: string[];
  campus_ids?: string[];
  group_id?: string | null;
};

function decodeClaims(token: string): Claims {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Claims;
  } catch {
    return {};
  }
}

/** The signed-in user, with the roles and campuses that came from the token hook. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const claims = decodeClaims(session.access_token);

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', session.user.id)
    .maybeSingle();

  return {
    id: session.user.id,
    email: profile?.email ?? session.user.email ?? null,
    fullName: profile?.full_name ?? session.user.email ?? 'User',
    roles: claims.roles ?? [],
    campusIds: claims.campus_ids ?? [],
    groupId: claims.group_id ?? null,
  };
}

export function hasRole(user: SessionUser | null, ...roles: string[]): boolean {
  if (!user) return false;
  return user.roles.some((r) => roles.includes(r));
}
