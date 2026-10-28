import Link from 'next/link';
import { recordPaymentAction } from '@/app/actions';
import { api, formatDate, formatINR } from '@/lib/api';
import type { Invoice, Paginated } from '@/lib/types';
import { EmptyState, Pagination, StatusBadge } from '@/components/ui';

const STATUSES = ['UNPAID', 'PARTIAL', 'PAID'] as const;

export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1) || 1;
  const query = new URLSearchParams({ page: String(page), limit: '15' });
  if (params.q) query.set('q', params.q);
  if (params.status) query.set('status', params.status);

  const result = await api<Paginated<Invoice>>(`/fees/invoices?${query.toString()}`);
  const outstanding = result.data.reduce((n, i) => n + (i.amount - i.paidAmount), 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Fees</h1>
          <p className="text-sm text-slate-500">
            {result.meta.total} invoices · {formatINR(outstanding)} outstanding on this page
          </p>
        </div>
        <form className="flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Invoice no, student, roll…"
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
                <th className="th">Invoice</th>
                <th className="th">Student</th>
                <th className="th">Due date</th>
                <th className="th">Amount</th>
                <th className="th">Balance</th>
                <th className="th">Status</th>
                <th className="th">Collect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {result.data.map((inv) => {
                const balance = inv.amount - inv.paidAmount;
                return (
                  <tr key={inv.id} className="align-top hover:bg-slate-50">
                    <td className="td">
                      <p className="font-mono text-xs">{inv.number}</p>
                      <p className="text-xs text-slate-500">{inv.term}</p>
                    </td>
                    <td className="td">
                      <Link href={`/students/${inv.student.id}`} className="font-medium text-brand-600">
                        {inv.student.firstName} {inv.student.lastName}
                      </Link>
                      <p className="text-xs text-slate-500">{inv.student.enrollmentNo}</p>
                    </td>
                    <td className="td text-xs">{formatDate(inv.dueDate)}</td>
                    <td className="td">{formatINR(inv.amount)}</td>
                    <td className="td">
                      <span className={balance > 0 ? 'font-medium text-rose-600' : 'text-emerald-600'}>
                        {formatINR(balance)}
                      </span>
                    </td>
                    <td className="td">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="td">
                      {balance > 0 ? (
                        <form action={recordPaymentAction} className="flex items-center gap-1">
                          <input type="hidden" name="invoiceId" value={inv.id} />
                          <input
                            name="amount"
                            type="number"
                            min="1"
                            step="1"
                            defaultValue={Math.round(balance / 100)}
                            className="input w-24 px-2 py-1 text-xs"
                            aria-label="Amount in rupees"
                          />
                          <select name="mode" className="input w-24 px-1 py-1 text-xs">
                            <option value="CASH">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="CARD">Card</option>
                            <option value="NETBANKING">Netbanking</option>
                          </select>
                          <button type="submit" className="btn-primary px-2 py-1 text-xs">
                            Pay
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-slate-400">Settled</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {result.data.length === 0 ? <EmptyState title="No invoices matched" /> : null}
        <Pagination
          basePath="/fees"
          page={result.meta.page}
          pages={result.meta.pages}
          query={{ q: params.q, status: params.status }}
        />
      </div>
    </div>
  );
}
