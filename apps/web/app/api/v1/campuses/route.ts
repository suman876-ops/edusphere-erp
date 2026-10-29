import { getSessionUser } from '@/server/auth';
import { campusesForUser } from '@/server/tenancy';
import { fail, ok, handle } from '@/server/http';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Missing bearer token', 401);
    return ok(await campusesForUser(user));
  } catch (error) {
    return handle(error);
  }
}
