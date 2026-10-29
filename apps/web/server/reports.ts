import { createClient } from '@/lib/supabase/server';
import { requireCampus } from './tenancy';
import type { SessionUser } from './auth';

/** KPI snapshot for the campus dashboard. */
export async function dashboardSummary(user: SessionUser) {
  const campus = await requireCampus(user);
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);

  const [{ count: active }, { count: dropped }] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true })
      .eq('campus_id', campus.id).eq('status', 'active'),
    supabase.from('students').select('id', { count: 'exact', head: true })
      .eq('campus_id', campus.id).eq('status', 'dropped'),
  ]);

  const { data: todaySessions } = await supabase
    .from('attendance_sessions')
    .select('id')
    .eq('campus_id', campus.id)
    .eq('on_date', today);

  const sessionIds = (todaySessions ?? []).map((s) => s.id);

  const { data: marks } = sessionIds.length
    ? await supabase.from('attendance_records').select('status').in('session_id', sessionIds)
    : { data: [] as Array<{ status: string }> };

  const present = (marks ?? []).filter((m) => m.status === 'P' || m.status === 'OD').length;
  const totalMarks = (marks ?? []).length;

  const { data: invoices } = await supabase
    .from('fee_invoices')
    .select('amount_paise, status, payments (amount_paise)')
    .eq('campus_id', campus.id)
    .neq('status', 'void');

  let billed = 0;
  let paid = 0;
  let openInvoices = 0;
  for (const inv of invoices ?? []) {
    billed += inv.amount_paise;
    const invPaid = ((inv.payments ?? []) as Array<{ amount_paise: number }>).reduce(
      (n, p) => n + p.amount_paise,
      0,
    );
    paid += invPaid;
    if (inv.status !== 'paid') openInvoices += 1;
  }

  const { data: recentSessions } = await supabase
    .from('attendance_sessions')
    .select('id, on_date, mode, status, subject:subjects (code, title), section:sections (name)')
    .eq('campus_id', campus.id)
    .order('opened_at', { ascending: false })
    .limit(5);

  return {
    campus: { id: campus.id, name: campus.name, code: campus.code, isDemo: campus.is_demo },
    students: { active: active ?? 0, dropped: dropped ?? 0 },
    attendanceToday: {
      sessions: sessionIds.length,
      marks: totalMarks,
      present,
      percent: totalMarks === 0 ? 0 : Math.round((present / totalMarks) * 100),
    },
    finance: {
      billedPaise: billed,
      collectedPaise: paid,
      outstandingPaise: Math.max(0, billed - paid),
      openInvoices,
    },
    recentSessions: recentSessions ?? [],
  };
}
