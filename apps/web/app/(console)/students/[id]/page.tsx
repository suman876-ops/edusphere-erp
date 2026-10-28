import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, formatDate, formatINR } from '@/lib/api';
import type { AttendanceSummary, Ledger, Student } from '@/lib/types';
import { StatusBadge } from '@/components/ui';

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let student: Student;
  try {
    student = await api<Student>(`/students/${id}`);
  } catch {
    notFound();
  }

  const [attendance, ledger] = await Promise.all([
    api<AttendanceSummary>(`/attendance/summary/${id}`),
    api<Ledger>(`/fees/ledger/${id}`),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/students" className="text-xs font-medium text-brand-600">
            ← Back to students
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-sm text-slate-500">
            {student.enrollmentNo} · {student.program.name} · {student.section.name} · batch{' '}
            {student.section.batch}
          </p>
        </div>
        <StatusBadge status={student.status} />
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card card-pad">
          <p className="text-xs uppercase tracking-wide text-slate-500">Attendance</p>
          <p
            className={`mt-2 text-2xl font-semibold ${
              attendance.overall.shortage ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {attendance.overall.percent}%
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {attendance.overall.attended}/{attendance.overall.held} classes
          </p>
        </div>
        <div className="card card-pad">
          <p className="text-xs uppercase tracking-wide text-slate-500">Billed</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatINR(ledger.totals.billed)}
          </p>
        </div>
        <div className="card card-pad">
          <p className="text-xs uppercase tracking-wide text-slate-500">Paid</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {formatINR(ledger.totals.paid)}
          </p>
        </div>
        <div className="card card-pad">
          <p className="text-xs uppercase tracking-wide text-slate-500">Outstanding</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">
            {formatINR(ledger.totals.outstanding)}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">
            Subject-wise attendance
          </h2>
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Course</th>
                <th className="th">Attended</th>
                <th className="th">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendance.subjects.length === 0 ? (
                <tr>
                  <td className="td text-slate-500" colSpan={3}>
                    No attendance recorded yet.
                  </td>
                </tr>
              ) : (
                attendance.subjects.map((s) => (
                  <tr key={s.code}>
                    <td className="td">
                      <span className="font-mono text-xs">{s.code}</span>
                      <p className="text-xs text-slate-500">{s.title}</p>
                    </td>
                    <td className="td">
                      {s.attended}/{s.held}
                    </td>
                    <td className="td">
                      <span className={s.shortage ? 'font-semibold text-rose-600' : 'text-emerald-600'}>
                        {s.percent}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">
            Fee ledger
          </h2>
          <ul className="divide-y divide-slate-100">
            {ledger.invoices.map((inv) => (
              <li key={inv.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{inv.term}</p>
                  <p className="text-xs text-slate-500">
                    {inv.number} · due {formatDate(inv.dueDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-800">{formatINR(inv.amount)}</p>
                  <StatusBadge status={inv.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
