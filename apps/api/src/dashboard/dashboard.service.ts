import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { campusWhere } from '../common/scope';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(campusId: string | null) {
    const { campusId: cid } = campusWhere(campusId);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      activeStudents,
      droppedStudents,
      sessionsToday,
      recordsToday,
      invoices,
      paymentsThisMonth,
      recentInvoices,
      sessionList,
    ] = await this.prisma.$transaction([
      this.prisma.student.count({ where: { campusId: cid, status: 'ACTIVE' } }),
      this.prisma.student.count({ where: { campusId: cid, status: 'DROPPED' } }),
      this.prisma.attendanceSession.count({
        where: { campusId: cid, date: { gte: startOfDay } },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { session: { campusId: cid }, markedAt: { gte: startOfDay } },
        select: { status: true },
      }),
      this.prisma.feeInvoice.findMany({
        where: { campusId: cid, status: { in: ['UNPAID', 'PARTIAL'] } },
        select: { amount: true, paidAmount: true },
      }),
      this.prisma.feePayment.aggregate({
        where: { campusId: cid, paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.feeInvoice.findMany({
        where: { campusId: cid },
        include: { student: { select: { firstName: true, lastName: true, enrollmentNo: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.attendanceSession.findMany({
        where: { campusId: cid },
        include: {
          course: { select: { code: true, title: true } },
          section: { select: { name: true } },
          _count: { select: { records: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const present = recordsToday.filter((r) => r.status === 'P' || r.status === 'OD').length;
    const outstanding = invoices.reduce((n, i) => n + (i.amount - i.paidAmount), 0);

    return {
      students: { active: activeStudents, dropped: droppedStudents },
      attendanceToday: {
        sessions: sessionsToday,
        marks: recordsToday.length,
        present,
        percent: recordsToday.length
          ? Math.round((present / recordsToday.length) * 1000) / 10
          : 0,
      },
      finance: {
        outstanding,
        collectedThisMonth: paymentsThisMonth._sum.amount ?? 0,
        paymentCount: paymentsThisMonth._count,
        openInvoices: invoices.length,
      },
      recentInvoices,
      recentSessions: sessionList,
    };
  }
}
