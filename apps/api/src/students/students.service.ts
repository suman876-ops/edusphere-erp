import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { campusWhere } from '../common/scope';
import { CreateStudentDto, ListStudentsQuery, UpdateStudentDto } from './dto';

const LIST_INCLUDE = {
  program: { select: { id: true, name: true, code: true } },
  section: { select: { id: true, name: true, batch: true, semester: true } },
} satisfies Prisma.StudentInclude;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(campusId: string | null, query: ListStudentsQuery) {
    const { campusId: cid } = campusWhere(campusId);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where: Prisma.StudentWhereInput = { campusId: cid };

    if (query.status) where.status = query.status;
    if (query.programId) where.programId = query.programId;
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.q) {
      const q = query.q.trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { enrollmentNo: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: [{ admissionYear: 'desc' }, { enrollmentNo: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.student.count({ where }),
    ]);

    return { data, meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async getOne(campusId: string | null, id: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, ...campusWhere(campusId) },
      include: {
        ...LIST_INCLUDE,
        invoices: { orderBy: { dueDate: 'desc' }, take: 10 },
      },
    });
    if (!student) throw new NotFoundException('Student not found in this campus');
    return student;
  }

  async create(campusId: string | null, dto: CreateStudentDto) {
    const { campusId: cid } = campusWhere(campusId);
    const [program, section] = await Promise.all([
      this.prisma.program.findFirst({ where: { id: dto.programId, campusId: cid } }),
      this.prisma.section.findFirst({ where: { id: dto.sectionId, campusId: cid } }),
    ]);
    if (!program) throw new BadRequestException('programId does not belong to this campus');
    if (!section) throw new BadRequestException('sectionId does not belong to this campus');

    const clash = await this.prisma.student.findUnique({
      where: { enrollmentNo: dto.enrollmentNo },
      select: { id: true },
    });
    if (clash) throw new BadRequestException('enrollmentNo already exists');

    return this.prisma.student.create({
      data: { ...dto, campusId: cid, email: dto.email?.toLowerCase() },
      include: LIST_INCLUDE,
    });
  }

  async update(campusId: string | null, id: string, dto: UpdateStudentDto) {
    await this.getOne(campusId, id);
    return this.prisma.student.update({
      where: { id },
      data: { ...dto, email: dto.email?.toLowerCase() },
      include: LIST_INCLUDE,
    });
  }
}
