import { getSessionUser } from '@/server/auth';
import { createStudentRow, listStudents } from '@/server/students';
import { listStudentsQuery, createStudent } from '@/lib/validation';
import { fail, ok, handle } from '@/server/http';

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Missing bearer token', 401);
    const url = new URL(req.url);
    const query = listStudentsQuery.parse(Object.fromEntries(url.searchParams));
    return ok(await listStudents(user, query));
  } catch (error) {
    return handle(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Missing bearer token', 401);
    const input = createStudent.parse(await req.json());
    return ok(await createStudentRow(user, input), 201);
  } catch (error) {
    return handle(error);
  }
}
