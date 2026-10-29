import { getSessionUser } from '@/server/auth';
import { listSessions, openAttendanceSession } from '@/server/attendance';
import { openSession } from '@/lib/validation';
import { fail, ok, handle } from '@/server/http';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Missing bearer token', 401);
    return ok(await listSessions(user));
  } catch (error) {
    return handle(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Missing bearer token', 401);
    const input = openSession.parse(await req.json());
    return ok(await openAttendanceSession(user, input), 201);
  } catch (error) {
    return handle(error);
  }
}
