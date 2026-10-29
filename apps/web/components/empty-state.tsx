import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center',
        className,
      )}
    >
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {hint ? <p className="max-w-md text-sm text-slate-500">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
