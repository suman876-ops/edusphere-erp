import { Controller, Get } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators';
import { PrismaService } from '../common/prisma.service';

@Controller('campuses')
export class CampusesController {
  constructor(private readonly prisma: PrismaService) {}

  /** SA sees the whole group; campus users see only their own campus. */
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.campus.findMany({
      where: user.role === 'SA' ? {} : { id: user.campusId ?? 'none' },
      select: { id: true, name: true, code: true, city: true },
      orderBy: { name: 'asc' },
    });
  }
}
