import { getSessionUser } from '@/server/auth';
import { listAudit } from '@/server/audit';
import { fail, ok, handle } from '@/server/http';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Missing bearer token', 401);
    return ok(await listAudit(user));
  } catch (error) {
    return handle(error);
  }
}
