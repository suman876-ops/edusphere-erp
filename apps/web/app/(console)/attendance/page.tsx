import Link from 'next/link';
import { startSessionAction } from '@/app/actions';
import { api, formatDate } from '@/lib/api';
import type { SessionRow } from '@/lib/types';
import { EmptyState, StatusBadge } from '@/components/ui';

interface Course {
  id: string;
  code: string;
  title: string;
}
interface Section {
  id: string;
  name: string;
  batch: number;
  program: { code: string };
}

export default async function AttendancePage() {
  const [sessions, courses, sections] = await Promise.all([
    api<SessionRow[]>('/attendance/sessions'),
    api<Course[]>('/courses'),
    api<Section[]>('/sections'),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900">Attendance</h1>
        <p className="text-sm text-slate-500">
          Session-based marking with rotating QR. Manual and QR+geofence modes supported.
        </p>
      </header>

      <section className="card card-pad">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Start a session</h2>
        <form action={startSessionAction} className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="label" htmlFor="courseId">
              Course
            </label>
            <select id="courseId" name="courseId" required className="input">
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="sectionId">
              Section
            </label>
            <select id="sectionId" name="sectionId" required className="input">
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.program.code} · {s.name} ({s.batch})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="mode">
              Mode
            </label>
            <select id="mode" name="mode" className="input" defaultValue="QR">
              <option value="MANUAL">Manual roll call</option>
              <option value="QR">Rotating QR</option>
              <option value="QR_GEOFENCE">QR + geofence (campus centre)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full">
              Start session
            </button>
          </div>
        </form>
      </section>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Recent sessions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Course</th>
                <th className="th">Section</th>
                <th className="th">Date</th>
                <th className="th">Mode</th>
                <th className="th">Marked</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="td">
                    <Link href={`/attendance/${s.id}`} className="font-medium text-brand-600">
                      {s.course.code}
                    </Link>
                    <p className="text-xs text-slate-500">{s.course.title}</p>
                  </td>
                  <td className="td">{s.section.name}</td>
                  <td className="td">{formatDate(s.date)}</td>
                  <td className="td text-xs">{s.mode}</td>
                  <td className="td">{s._count?.records ?? 0}</td>
                  <td className="td">
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sessions.length === 0 ? <EmptyState title="No sessions yet" /> : null}
      </div>
    </div>
  );
}
