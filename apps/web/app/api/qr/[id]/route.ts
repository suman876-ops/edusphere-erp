import { getSessionUser } from '@/server/auth';
import { currentQrToken } from '@/server/attendance';
import { fail, ok, handle } from '@/server/http';

/** Thin wrapper the QR panel polls. Same path as before, so the component is unchanged. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Missing bearer token', 401);
    const { id } = await ctx.params;
    return ok(await currentQrToken(user, id));
  } catch (error) {
    return handle(error);
  }
}
