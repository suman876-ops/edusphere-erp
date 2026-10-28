import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceMode, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AuthUser } from '../common/decorators';
import { PrismaService } from '../common/prisma.service';
import { campusWhere } from '../common/scope';
import { CreateSessionDto, ManualMarkDto, ScanDto } from './dto';
import { currentToken, haversineMeters, verifyToken } from './qr';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(campusId: string | null, user: AuthUser, dto: CreateSessionDto) {
    const { campusId: cid } = campusWhere(campusId);
    const [course, section] = await Promise.all([
      this.prisma.course.findFirst({ where: { id: dto.courseId, campusId: cid } }),
      this.prisma.section.findFirst({ where: { id: dto.sectionId, campusId: cid } }),
    ]);
    if (!course) throw new BadRequestException('courseId does not belong to this campus');
    if (!section) throw new BadRequestException('sectionId does not belong to this campus');

    const mode = dto.mode ?? AttendanceMode.QR;
    if (mode === AttendanceMode.QR_GEOFENCE && (dto.lat === undefined || dto.lng === undefined)) {
      throw new BadRequestException('QR_GEOFENCE sessions need lat and lng');
    }

    return this.prisma.attendanceSession.create({
      data: {
        campusId: cid,
        courseId: dto.courseId,
        sectionId: dto.sectionId,
        facultyId: user.sub,
        date: dto.date ? new Date(dto.date) : new Date(),
        mode,
        qrSecret: randomBytes(24).toString('hex'),
        lat: dto.lat,
        lng: dto.lng,
        radiusM: dto.radiusM ?? 150,
      },
      include: { course: true, section: true },
    });
  }

  async listSessions(campusId: string | null, take = 20) {
    const { campusId: cid } = campusWhere(campusId);
    return this.prisma.attendanceSession.findMany({
      where: { campusId: cid },
      include: {
        course: { select: { code: true, title: true } },
        section: { select: { name: true, batch: true } },
        _count: { select: { records: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async getSession(campusId: string | null, id: string) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: { id, ...campusWhere(campusId) },
      include: {
        course: { select: { code: true, title: true } },
        section: { select: { name: true, batch: true, id: true } },
        records: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, enrollmentNo: true },
            },
          },
          orderBy: { markedAt: 'asc' },
        },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    const roster = await this.prisma.student.count({
      where: { sectionId: session.sectionId, status: 'ACTIVE' },
    });
    const present = session.records.filter((r) => r.status === 'P' || r.status === 'OD').length;
    return { ...session, stats: { roster, present, absent: Math.max(roster - present, 0) } };
  }

  async getQr(campusId: string | null, id: string) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: { id, ...campusWhere(campusId) },
      select: { id: true, qrSecret: true, status: true, mode: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'OPEN') throw new BadRequestException('Session is closed');
    return { sessionId: session.id, mode: session.mode, ...currentToken(session.qrSecret, session.id) };
  }

  /** Rotate the secret, invalidating every outstanding code. */
  async rotate(campusId: string | null, id: string) {
    await this.getSession(campusId, id);
    const session = await this.prisma.attendanceSession.update({
      where: { id },
      data: { qrSecret: randomBytes(24).toString('hex') },
      select: { id: true, qrSecret: true },
    });
    return { sessionId: session.id, ...currentToken(session.qrSecret, session.id) };
  }

  async scan(campusId: string | null, user: AuthUser, id: string, dto: ScanDto) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: { id, ...campusWhere(campusId) },
      include: { course: { select: { code: true } }, section: { select: { name: true } } },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'OPEN') throw new BadRequestException('Session is closed');

    const verdict = verifyToken(session.qrSecret, session.id, dto.token);
    if (!verdict.ok) throw new BadRequestException(verdict.reason ?? 'Invalid QR code');

    const student = await this.resolveStudent(campusId, user, dto.studentId);
    if (student.sectionId !== session.sectionId) {
      throw new BadRequestException('You are not enrolled in this section');
    }

    if (session.mode === AttendanceMode.QR_GEOFENCE) {
      if (dto.lat === undefined || dto.lng === undefined) {
        throw new BadRequestException('Location is required for this session');
      }
      if (session.lat === null || session.lng === null) {
        throw new BadRequestException('Session has no geofence configured');
      }
      const distance = haversineMeters(session.lat, session.lng, dto.lat, dto.lng);
      if (distance > session.radiusM) {
        throw new BadRequestException(
          `Outside the classroom geofence (${Math.round(distance)} m away, limit ${session.radiusM} m)`,
        );
      }
    }

    if (dto.deviceId) {
      const borrowed = await this.prisma.attendanceRecord.findFirst({
        where: { sessionId: session.id, deviceId: dto.deviceId, studentId: { not: student.id } },
        select: { id: true },
      });
      if (borrowed) throw new ConflictException('This device already marked another student');
    }

    const record = await this.prisma.attendanceRecord.upsert({
      where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
      create: {
        sessionId: session.id,
        studentId: student.id,
        status: 'P',
        source: 'QR',
        lat: dto.lat,
        lng: dto.lng,
        deviceId: dto.deviceId,
      },
      update: { status: 'P', source: 'QR', markedAt: new Date() },
    });

    return {
      record,
      student: { id: student.id, name: `${student.firstName} ${student.lastName}` },
      session: { id: session.id, course: session.course.code, section: session.section.name },
    };
  }

  async manualMark(campusId: string | null, id: string, dto: ManualMarkDto) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: { id, ...campusWhere(campusId) },
      select: { id: true, sectionId: true },
    });
    if (!session) throw new NotFoundException('Session not found');

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, ...campusWhere(campusId) },
      select: { id: true, sectionId: true },
    });
    if (!student) throw new NotFoundException('Student not found');
    if (student.sectionId !== session.sectionId) {
      throw new BadRequestException('Student is not in this section');
    }

    return this.prisma.attendanceRecord.upsert({
      where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
      create: { sessionId: session.id, studentId: student.id, status: dto.status, source: 'MANUAL' },
      update: { status: dto.status, source: 'MANUAL', markedAt: new Date() },
    });
  }

  async close(campusId: string | null, id: string) {
    await this.getSession(campusId, id);
    return this.prisma.attendanceSession.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
      select: { id: true, status: true, closedAt: true },
    });
  }

  /** Subject-wise attendance with the <75% shortage flag from the spec. */
  async summary(campusId: string | null, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, ...campusWhere(campusId) },
      include: { program: { select: { code: true } }, section: { select: { name: true } } },
    });
    if (!student) throw new NotFoundException('Student not found');

    const records = await this.prisma.attendanceRecord.findMany({
      where: { studentId },
      include: { session: { include: { course: { select: { code: true, title: true } } } } },
      orderBy: { markedAt: 'desc' },
    });

    const byCourse = new Map<string, { code: string; title: string; held: number; attended: number }>();
    for (const r of records) {
      const key = r.session.course.code;
      const row = byCourse.get(key) ?? {
        code: key,
        title: r.session.course.title,
        held: 0,
        attended: 0,
      };
      row.held += 1;
      if (r.status === 'P' || r.status === 'OD') row.attended += 1;
      byCourse.set(key, row);
    }

    const subjects = [...byCourse.values()].map((s) => ({
      ...s,
      percent: s.held ? Math.round((s.attended / s.held) * 1000) / 10 : 0,
      shortage: s.held > 0 && s.attended / s.held < 0.75,
    }));
    const held = subjects.reduce((n, s) => n + s.held, 0);
    const attended = subjects.reduce((n, s) => n + s.attended, 0);

    return {
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        enrollmentNo: student.enrollmentNo,
        program: student.program.code,
        section: student.section.name,
      },
      overall: {
        held,
        attended,
        percent: held ? Math.round((attended / held) * 1000) / 10 : 0,
        shortage: held > 0 && attended / held < 0.75,
      },
      subjects,
    };
  }

  private async resolveStudent(
    campusId: string | null,
    user: AuthUser,
    explicitId?: string,
  ): Promise<{ id: string; firstName: string; lastName: string; sectionId: string }> {
    const where: Prisma.StudentWhereInput = { ...campusWhere(campusId) };
    if (explicitId) {
      if (user.role === 'STU') throw new BadRequestException('Students cannot mark others');
      where.id = explicitId;
    } else if (user.role === 'STU') {
      where.email = user.email;
    } else {
      throw new BadRequestException('studentId is required for staff-initiated scans');
    }

    const student = await this.prisma.student.findFirst({
      where,
      select: { id: true, firstName: true, lastName: true, sectionId: true },
    });
    if (!student) throw new NotFoundException('No student record linked to this login');
    return student;
  }
}
