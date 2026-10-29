import { getSessionUser } from '@/server/auth';
import { createInvoiceRow, listInvoices } from '@/server/fees';
import { createInvoice } from '@/lib/validation';
import { fail, ok, handle } from '@/server/http';

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Missing bearer token', 401);
    const p = new URL(req.url).searchParams;
    return ok(await listInvoices(user, {
      status: p.get('status') ?? undefined,
      term: p.get('term') ?? undefined,
      q: p.get('q') ?? undefined,
      page: p.get('page') ? Number(p.get('page')) : 1,
      limit: p.get('limit') ? Number(p.get('limit')) : 20,
    }));
  } catch (error) {
    return handle(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Missing bearer token', 401);
    const input = createInvoice.parse(await req.json());
    return ok(await createInvoiceRow(user, input), 201);
  } catch (error) {
    return handle(error);
  }
}
