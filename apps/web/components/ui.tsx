import Link from 'next/link';

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warn' | 'good';
}) {
  const toneClass =
    tone === 'warn' ? 'text-rose-600' : tone === 'good' ? 'text-emerald-600' : 'text-slate-900';
  return (
    <div className="card card-pad">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  DROPPED: 'bg-rose-50 text-rose-700',
  ALUMNI: 'bg-slate-100 text-slate-600',
  PAID: 'bg-emerald-50 text-emerald-700',
  PARTIAL: 'bg-amber-50 text-amber-700',
  UNPAID: 'bg-rose-50 text-rose-700',
  VOID: 'bg-slate-100 text-slate-500',
  OPEN: 'bg-brand-50 text-brand-700',
  CLOSED: 'bg-slate-100 text-slate-600',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {hint ? <p className="text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Pagination({
  basePath,
  page,
  pages,
  query,
}: {
  basePath: string;
  page: number;
  pages: number;
  query: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
    params.set('page', String(p));
    return `${basePath}?${params.toString()}`;
  };
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
      <span>
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="btn-ghost">
            Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={href(page + 1)} className="btn-ghost">
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}
