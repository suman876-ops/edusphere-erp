import { Controller, Get } from '@nestjs/common';
import { CampusCtx } from '../common/decorators';
import { PrismaService } from '../common/prisma.service';
import { campusWhere } from '../common/scope';

/** Read-only academic structure used to populate selects in the console. */
@Controller()
export class StructureController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('programs')
  programs(@CampusCtx() campusId: string | null) {
    return this.prisma.program.findMany({
      where: campusWhere(campusId),
      select: { id: true, name: true, code: true, level: true, department: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  @Get('sections')
  sections(@CampusCtx() campusId: string | null) {
    return this.prisma.section.findMany({
      where: campusWhere(campusId),
      select: { id: true, name: true, batch: true, semester: true, program: { select: { code: true } } },
      orderBy: [{ batch: 'desc' }, { name: 'asc' }],
    });
  }

  @Get('courses')
  courses(@CampusCtx() campusId: string | null) {
    return this.prisma.course.findMany({
      where: campusWhere(campusId),
      select: { id: true, code: true, title: true, credits: true, semester: true },
      orderBy: { code: 'asc' },
    });
  }
}
