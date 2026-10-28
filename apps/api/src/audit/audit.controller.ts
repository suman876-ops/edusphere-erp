import { Controller, Get, Query } from '@nestjs/common';
import { CampusCtx, Roles } from '../common/decorators';
import { PrismaService } from '../common/prisma.service';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Roles('SA', 'CA')
  @Get()
  list(@CampusCtx() campusId: string | null, @Query('limit') limit?: string) {
    return this.prisma.auditLog.findMany({
      where: campusId ? { campusId } : {},
      include: { actor: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit ?? 50), 200),
    });
  }
}
