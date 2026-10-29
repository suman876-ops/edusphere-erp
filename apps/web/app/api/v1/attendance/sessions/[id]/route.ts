import { getSessionUser } from '@/server/auth';
import { getAttendanceSession } from '@/server/attendance';
import { fail, ok, handle } from '@/server/http';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Missing bearer token', 401);
    const { id } = await ctx.params;
    return ok(await getAttendanceSession(user, id));
  } catch (error) {
    return handle(error);
  }
}
