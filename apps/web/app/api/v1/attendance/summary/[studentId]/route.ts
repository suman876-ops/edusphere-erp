import { getSessionUser } from '@/server/auth';
import { attendanceSummary } from '@/server/attendance';
import { fail, ok, handle } from '@/server/http';

export async function GET(_req: Request, ctx: { params: Promise<{ studentId: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Missing bearer token', 401);
    const { studentId } = await ctx.params;
    return ok(await attendanceSummary(user, studentId));
  } catch (error) {
    return handle(error);
  }
}
