import { getSessionUser } from '@/server/auth';
import { getStudent, updateStudentRow } from '@/server/students';
import { updateStudent } from '@/lib/validation';
import { fail, ok, handle } from '@/server/http';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Missing bearer token', 401);
    const { id } = await ctx.params;
    return ok(await getStudent(user, id));
  } catch (error) {
    return handle(error);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Missing bearer token', 401);
    const { id } = await ctx.params;
    const input = updateStudent.parse(await req.json());
    return ok(await updateStudentRow(user, id, input));
  } catch (error) {
    return handle(error);
  }
}
