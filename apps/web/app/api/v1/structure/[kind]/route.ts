import { getSessionUser } from '@/server/auth';
import { listStructure, type StructureKind } from '@/server/structure';
import { fail, ok, handle } from '@/server/http';

const KINDS: StructureKind[] = ['programs', 'sections', 'subjects', 'departments', 'batches'];

export async function GET(_req: Request, ctx: { params: Promise<{ kind: string }> }) {
  try {
    const { kind } = await ctx.params;
    if (!KINDS.includes(kind as StructureKind)) return fail('Unknown structure kind', 404);

    const user = await getSessionUser();
    if (!user) return fail('Missing bearer token', 401);
    return ok(await listStructure(user, kind as StructureKind));
  } catch (error) {
    return handle(error);
  }
}
