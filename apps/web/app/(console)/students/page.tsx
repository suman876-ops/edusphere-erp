import Link from 'next/link';
import { api } from '@/lib/api';
import type { Paginated, Student } from '@/lib/types';
import { EmptyState, Pagination, StatusBadge } from '@/components/ui';

const STATUSES = ['ACTIVE', 'DROPPED', 'ALUMNI'] as const;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1) || 1;
  const query = new URLSearchParams({ page: String(page), limit: '20' });
  if (params.q) query.set('q', params.q);
  if (params.status) query.set('status', params.status);

  const result = await api<Paginated<Student>>(`/students?${query.toString()}`);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Students</h1>
          <p className="text-sm text-slate-500">
            {result.meta.total} records in this campus · search by name, roll number or email.
          </p>
        </div>
        <form className="flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Search students…"
            className="input w-56"
          />
          <select name="status" defaultValue={params.status ?? ''} className="input w-36">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary">
            Filter
          </button>
        </form>
      </header>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Student</th>
                <th className="th">Enrolment</th>
                <th className="th">Program</th>
                <th className="th">Section</th>
                <th className="th">Admitted</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {result.data.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="td">
                    <Link href={`/students/${s.id}`} className="font-medium text-brand-600">
                      {s.firstName} {s.lastName}
                    </Link>
                    <p className="text-xs text-slate-500">{s.email ?? 'no email'}</p>
                  </td>
                  <td className="td font-mono text-xs">{s.enrollmentNo}</td>
                  <td className="td">{s.program.code}</td>
                  <td className="td">{s.section.name}</td>
                  <td className="td">{s.admissionYear}</td>
                  <td className="td">
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.data.length === 0 ? (
          <EmptyState title="No students matched" hint="Try a different search or clear filters." />
        ) : null}
        <Pagination
          basePath="/students"
          page={result.meta.page}
          pages={result.meta.pages}
          query={{ q: params.q, status: params.status }}
        />
      </div>
    </div>
  );
}
