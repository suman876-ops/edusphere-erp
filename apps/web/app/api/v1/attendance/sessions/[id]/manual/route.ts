import { getSessionUser } from '@/server/auth';
import { markManually } from '@/server/attendance';
import { manualMark } from '@/lib/validation';
import { fail, ok, handle } from '@/server/http';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Missing bearer token', 401);
    const { id } = await ctx.params;
    const input = manualMark.parse(await req.json());
    return ok(await markManually(user, id, input), 201);
  } catch (error) {
    return handle(error);
  }
}
