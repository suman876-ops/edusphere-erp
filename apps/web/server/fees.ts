import { createClient } from '@/lib/supabase/server';
import { requireCampus } from './tenancy';
import { hasRole, type SessionUser } from './auth';
import type { createInvoice, recordPayment } from '@/lib/validation';
import type { z } from 'zod';

const INVOICE_ROW = `id, number, term, head, due_date, amount_paise, status,
  student_id, student:students (id, reg_no, first_name, last_name, section:sections (name))`;

export async function listInvoices(
  user: SessionUser,
  opts: { status?: string; term?: string; q?: string; page?: number; limit?: number } = {},
) {
  const campus = await requireCampus(user);
  const page = opts.page ?? 1;
  const limit = Math.min(opts.limit ?? 20, 100);
  const from = (page - 1) * limit;

  const supabase = await createClient();
  let builder = supabase
    .from('fee_invoices')
    .select(INVOICE_ROW, { count: 'exact' })
    .eq('campus_id', campus.id)
    .order('due_date')
    .range(from, from + limit - 1);

  if (opts.status) builder = builder.eq('status', opts.status);
  if (opts.term) builder = builder.eq('term', opts.term);
  if (opts.q) builder = builder.ilike('number', `%${opts.q.replace(/[%,]/g, '')}%`);

  const { data, error, count } = await builder;
  if (error) throw error;

  const total = count ?? 0;
  return {
    data: data ?? [],
    meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

/** Invoice numbers come from a gapless per-campus sequence, inside the function. */
export async function createInvoiceRow(user: SessionUser, input: z.infer<typeof createInvoice>) {
  const campus = await requireCampus(user);
  const supabase = await createClient();

  const { data: student } = await supabase
    .from('students').select('id').eq('id', input.studentId).eq('campus_id', campus.id).maybeSingle();
  if (!student) throw new Error('studentId does not belong to this campus');

  const { data, error } = await supabase.rpc('app_create_invoice', {
    p_student: input.studentId,
    p_term: input.term,
    p_head: input.head,
    p_due: input.dueDate,
    p_amount: input.amountPaise,
  });
  if (error) throw error;

  const result = data as { invoice_id: string; number: string };
  const { data: invoice } = await supabase
    .from('fee_invoices').select(INVOICE_ROW).eq('id', result.invoice_id).single();

  return invoice ?? result;
}

/**
 * One transaction in the database: allocation, gapless receipt, ledger pair and
 * the recomputed status. The client never computes an amount.
 */
export async function recordPaymentRow(
  user: SessionUser,
  invoiceId: string,
  input: z.infer<typeof recordPayment>,
) {
  if (!hasRole(user, 'ACC', 'CA', 'SA')) {
    throw Object.assign(new Error('Requires role: ACC, CA, SA'), { code: '42501' });
  }
  const campus = await requireCampus(user);
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from('fee_invoices').select('id').eq('id', invoiceId).eq('campus_id', campus.id).maybeSingle();
  if (!invoice) throw Object.assign(new Error('Invoice not found'), { code: 'P0002' });

  const { data, error } = await supabase.rpc('app_record_payment', {
    p_invoice: invoiceId,
    p_amount: input.amountPaise,
    p_method: input.method,
    p_reference: input.reference ?? null,
  });
  if (error) throw error;

  const result = data as {
    payment_id: string;
    receipt_no: string;
    invoice_status: string;
    paid_paise: number;
    outstanding_paise: number;
  };

  const { data: payment } = await supabase
    .from('payments')
    .select('id, amount_paise, method, reference, status, paid_at, invoice_id')
    .eq('id', result.payment_id)
    .single();

  return {
    payment: { ...payment, receiptNo: result.receipt_no },
    invoice: {
      id: invoiceId,
      status: result.invoice_status,
      paidPaise: result.paid_paise,
      outstandingPaise: result.outstanding_paise,
    },
  };
}

/** Billed, paid and outstanding, all derived from the ledger — never stored. */
export async function studentLedger(user: SessionUser, studentId: string) {
  const campus = await requireCampus(user);
  const supabase = await createClient();

  const { data: student, error: sErr } = await supabase
    .from('students')
    .select('id, reg_no, first_name, last_name, program:programs (code), section:sections (name)')
    .eq('id', studentId)
    .eq('campus_id', campus.id)
    .maybeSingle();
  if (sErr) throw sErr;
  if (!student) throw Object.assign(new Error('Student not found'), { code: 'P0002' });

  const { data: invoices, error } = await supabase
    .from('fee_invoices')
    .select(`id, number, term, head, due_date, amount_paise, status,
             payments (id, amount_paise, method, paid_at, receipts (receipt_no))`)
    .eq('student_id', studentId)
    .eq('campus_id', campus.id)
    .order('due_date', { ascending: false });
  if (error) throw error;

  const billed = (invoices ?? []).reduce((n, i) => n + i.amount_paise, 0);
  const paid = (invoices ?? []).reduce(
    (n, i) => n + ((i.payments ?? []) as Array<{ amount_paise: number }>).reduce((m, p) => m + p.amount_paise, 0),
    0,
  );

  return {
    student: {
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
      regNo: student.reg_no,
      program: (student.program as { code?: string } | null)?.code ?? '',
      section: (student.section as { name?: string } | null)?.name ?? '',
    },
    totals: { billedPaise: billed, paidPaise: paid, outstandingPaise: billed - paid },
    invoices: invoices ?? [],
  };
}
