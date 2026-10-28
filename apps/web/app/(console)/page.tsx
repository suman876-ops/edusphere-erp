import Link from 'next/link';
import { api, formatDate, formatINR } from '@/lib/api';
import type { DashboardSummary } from '@/lib/types';
import { EmptyState, StatCard, StatusBadge } from '@/components/ui';

export default async function DashboardPage() {
  const summary = await api<DashboardSummary>('/dashboard/summary');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900">Campus dashboard</h1>
        <p className="text-sm text-slate-500">
          Live snapshot of enrolment, attendance and collections for the active campus.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active students"
          value={String(summary.students.active)}
          hint={`${summary.students.dropped} dropped`}
        />
        <StatCard
          label="Attendance today"
          value={`${summary.attendanceToday.percent}%`}
          hint={`${summary.attendanceToday.present}/${summary.attendanceToday.marks} marks · ${summary.attendanceToday.sessions} sessions`}
          tone={summary.attendanceToday.percent < 75 ? 'warn' : 'good'}
        />
        <StatCard
          label="Outstanding fees"
          value={formatINR(summary.finance.outstanding)}
          hint={`${summary.finance.openInvoices} open invoices`}
          tone={summary.finance.outstanding > 0 ? 'warn' : 'good'}
        />
        <StatCard
          label="Collected this month"
          value={formatINR(summary.finance.collectedThisMonth)}
          hint={`${summary.finance.paymentCount} receipts`}
          tone="good"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Recent attendance sessions</h2>
            <Link href="/attendance" className="text-xs font-medium text-brand-600">
              View all
            </Link>
          </div>
          {summary.recentSessions.length === 0 ? (
            <EmptyState title="No sessions yet" hint="Start one from the attendance page." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.recentSessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {s.course.code} · {s.section.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(s.date)} · {s.mode} · {s._count?.records ?? 0} marked
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Latest invoices</h2>
            <Link href="/fees" className="text-xs font-medium text-brand-600">
              View all
            </Link>
          </div>
          {summary.recentInvoices.length === 0 ? (
            <EmptyState title="No invoices yet" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.recentInvoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {inv.student.firstName} {inv.student.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {inv.number} · {formatINR(inv.amount - inv.paidAmount)} due
                    </p>
                  </div>
                  <StatusBadge status={inv.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
