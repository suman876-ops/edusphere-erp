import { getSessionUser } from '@/server/auth';
import { getActiveCampus } from '@/server/tenancy';
import { fail, ok, handle } from '@/server/http';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Missing bearer token', 401);
    const campus = await getActiveCampus(user);
    return ok({
      id: user.id,
      name: user.fullName,
      email: user.email,
      role: user.roles[0] ?? null,
      roles: user.roles,
      campusId: campus?.id ?? null,
      campusName: campus?.name ?? 'All campuses',
    });
  } catch (error) {
    return handle(error);
  }
}
