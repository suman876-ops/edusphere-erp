import { api } from '@/lib/api';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const data = await api(`/attendance/sessions/${id}/qr`);
    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'QR unavailable';
    return Response.json({ message }, { status: 400 });
  }
}
