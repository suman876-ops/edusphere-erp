import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { campusWhere } from '../common/scope';
import { CreateInvoiceDto, CreatePaymentDto, ListInvoicesQuery } from './dto';

const STUDENT_BRIEF = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    enrollmentNo: true,
    section: { select: { name: true } },
  },
} satisfies Prisma.StudentDefaultArgs;

/** Indian financial year label, e.g. 2026-27 (April -> March). */
export function financialYear(d = new Date()): string {
  const y = d.getMonth() + 1 >= 4 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

@Injectable()
export class FeesService {
  constructor(private readonly prisma: PrismaService) {}

  async listInvoices(campusId: string | null, query: ListInvoicesQuery) {
    const { campusId: cid } = campusWhere(campusId);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where: Prisma.FeeInvoiceWhereInput = { campusId: cid };

    if (query.status) where.status = query.status;
    if (query.term) where.term = query.term;
    if (query.q) {
      const q = query.q.trim();
      where.OR = [
        { number: { contains: q, mode: 'insensitive' } },
        { student: { firstName: { contains: q, mode: 'insensitive' } } },
        { student: { lastName: { contains: q, mode: 'insensitive' } } },
        { student: { enrollmentNo: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.feeInvoice.findMany({
        where,
        include: { student: STUDENT_BRIEF, payments: { orderBy: { paidAt: 'desc' }, take: 3 } },
        orderBy: [{ dueDate: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.feeInvoice.count({ where }),
    ]);

    return { data, meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async createInvoice(campusId: string | null, dto: CreateInvoiceDto) {
    const { campusId: cid } = campusWhere(campusId);
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, campusId: cid },
      select: { id: true },
    });
    if (!student) throw new BadRequestException('studentId does not belong to this campus');

    const seq = (await this.prisma.feeInvoice.count({ where: { campusId: cid } })) + 1;
    return this.prisma.feeInvoice.create({
      data: {
        campusId: cid,
        studentId: dto.studentId,
        number: `INV/${financialYear()}/${String(seq).padStart(5, '0')}`,
        term: dto.term,
        head: dto.head ?? 'Tuition',
        dueDate: new Date(dto.dueDate),
        amount: dto.amount,
      },
      include: { student: STUDENT_BRIEF },
    });
  }

  /**
   * Counter/online payment capture. Runs in a transaction so the ledger, the
   * invoice balance and the receipt number can never disagree.
   */
  async addPayment(campusId: string | null, invoiceId: string, dto: CreatePaymentDto) {
    const { campusId: cid } = campusWhere(campusId);
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.feeInvoice.findFirst({
        where: { id: invoiceId, campusId: cid },
        include: { student: STUDENT_BRIEF },
      });
      if (!invoice) throw new NotFoundException('Invoice not found');
      if (invoice.status === InvoiceStatus.PAID) {
        throw new BadRequestException('Invoice is already fully paid');
      }
      if (invoice.status === InvoiceStatus.VOID) throw new BadRequestException('Invoice is void');

      const outstanding = invoice.amount - invoice.paidAmount;
      if (dto.amount > outstanding) {
        throw new BadRequestException(
          `Payment exceeds outstanding balance of INR ${(outstanding / 100).toFixed(2)}`,
        );
      }

      const campus = await tx.campus.findUniqueOrThrow({
        where: { id: cid },
        select: { code: true },
      });
      const seq = (await tx.feePayment.count({ where: { campusId: cid } })) + 1;
      const payment = await tx.feePayment.create({
        data: {
          campusId: cid,
          invoiceId: invoice.id,
          amount: dto.amount,
          mode: dto.mode,
          reference: dto.reference,
          receiptNo: `RCPT/${campus.code}/${financialYear()}/${String(seq).padStart(6, '0')}`,
        },
      });

      const paidAmount = invoice.paidAmount + dto.amount;
      const status =
        paidAmount >= invoice.amount
          ? InvoiceStatus.PAID
          : paidAmount > 0
            ? InvoiceStatus.PARTIAL
            : InvoiceStatus.UNPAID;

      const updated = await tx.feeInvoice.update({
        where: { id: invoice.id },
        data: { paidAmount, status },
        include: { student: STUDENT_BRIEF },
      });

      return { payment, invoice: updated };
    });
  }

  async ledger(campusId: string | null, studentId: string) {
    const { campusId: cid } = campusWhere(campusId);
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, campusId: cid },
      include: { program: { select: { code: true } }, section: { select: { name: true } } },
    });
    if (!student) throw new NotFoundException('Student not found');

    const invoices = await this.prisma.feeInvoice.findMany({
      where: { studentId, campusId: cid },
      include: { payments: { orderBy: { paidAt: 'desc' } } },
      orderBy: { dueDate: 'desc' },
    });

    const billed = invoices.reduce((n, i) => n + i.amount, 0);
    const paid = invoices.reduce((n, i) => n + i.paidAmount, 0);

    return {
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        enrollmentNo: student.enrollmentNo,
        program: student.program.code,
        section: student.section.name,
      },
      totals: { billed, paid, outstanding: billed - paid },
      invoices,
    };
  }
}
