import Link from 'next/link';
import { closeSessionAction, simulateScanAction } from '@/app/actions';
import { api, formatDate } from '@/lib/api';
import type { Paginated, SessionDetail, Student } from '@/lib/types';
import { StatusBadge } from '@/components/ui';
import { QrLive } from '@/components/qr-live';

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await api<SessionDetail>(`/attendance/sessions/${id}`);
  const roster = await api<Paginated<Student>>(
    `/students?sectionId=${session.section.id}&limit=100`,
  );

  const marked = new Set(session.records.map((r) => r.student.id));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/attendance" className="text-xs font-medium text-brand-600">
            ← All sessions
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {session.course.code} · {session.section.name}
          </h1>
          <p className="text-sm text-slate-500">
            {formatDate(session.date)} · {session.mode} · {session.stats.present}/
            {session.stats.roster} present
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={session.status} />
          {session.status === 'OPEN' ? (
            <form action={closeSessionAction}>
              <input type="hidden" name="sessionId" value={session.id} />
              <button type="submit" className="btn-ghost">
                Close session
              </button>
            </form>
          ) : null}
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="card card-pad lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Live QR</h2>
          {session.status === 'OPEN' ? (
            <QrLive sessionId={session.id} />
          ) : (
            <p className="text-sm text-slate-500">Session closed — no active code.</p>
          )}
          {session.mode === 'QR_GEOFENCE' ? (
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              Geofence: {session.radiusM} m around {session.lat?.toFixed(4)},{' '}
              {session.lng?.toFixed(4)}
            </p>
          ) : null}
        </div>

        <div className="card overflow-hidden lg:col-span-2">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Attendance register</h2>
            <p className="text-xs text-slate-500">
              {session.stats.present} present · {session.stats.absent} not marked
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="th">Student</th>
                  <th className="th">Status</th>
                  <th className="th">Source</th>
                  <th className="th">Marked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {session.records.length === 0 ? (
                  <tr>
                    <td className="td text-slate-500" colSpan={4}>
                      Nobody marked yet. Share the QR or simulate a scan below.
                    </td>
                  </tr>
                ) : (
                  session.records.map((r) => (
                    <tr key={r.id}>
                      <td className="td">
                        {r.student.firstName} {r.student.lastName}
                        <p className="text-xs text-slate-500">{r.student.enrollmentNo}</p>
                      </td>
                      <td className="td">
                        <StatusBadge status={r.status === 'P' ? 'ACTIVE' : 'DROPPED'} />
                        <span className="ml-1 text-xs text-slate-500">{r.status}</span>
                      </td>
                      <td className="td text-xs">{r.source}</td>
                      <td className="td text-xs">
                        {new Date(r.markedAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {session.status === 'OPEN' ? (
        <section className="card card-pad">
          <h2 className="text-sm font-semibold text-slate-800">Simulate a student scan</h2>
          <p className="mb-3 text-xs text-slate-500">
            Uses the live rotating token exactly like the mobile app would. In QR+geofence mode the
            coordinates below are the campus centre.
          </p>
          <form action={simulateScanAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="sessionId" value={session.id} />
            {session.mode === 'QR_GEOFENCE' ? (
              <>
                <input type="hidden" name="lat" value={session.lat ?? 0} />
                <input type="hidden" name="lng" value={session.lng ?? 0} />
              </>
            ) : null}
            <div className="min-w-[240px] flex-1">
              <label className="label" htmlFor="studentId">
                Student in {session.section.name}
              </label>
              <select id="studentId" name="studentId" className="input" required>
                {roster.data.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.enrollmentNo} — {s.firstName} {s.lastName}
                    {marked.has(s.id) ? ' (already marked)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary">
              Mark present via QR
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
