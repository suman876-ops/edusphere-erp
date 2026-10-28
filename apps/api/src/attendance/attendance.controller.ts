import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AuthUser, CampusCtx, CurrentUser, Roles } from '../common/decorators';
import { AttendanceService } from './attendance.service';
import { CreateSessionDto, ManualMarkDto, ScanDto } from './dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get('sessions')
  listSessions(@CampusCtx() campusId: string | null) {
    return this.attendance.listSessions(campusId);
  }

  @Roles('SA', 'CA', 'HOD', 'FAC')
  @Post('sessions')
  createSession(
    @CampusCtx() campusId: string | null,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSessionDto,
  ) {
    return this.attendance.createSession(campusId, user, dto);
  }

  @Get('sessions/:id')
  getSession(@CampusCtx() campusId: string | null, @Param('id') id: string) {
    return this.attendance.getSession(campusId, id);
  }

  @Get('sessions/:id/qr')
  getQr(@CampusCtx() campusId: string | null, @Param('id') id: string) {
    return this.attendance.getQr(campusId, id);
  }

  @Roles('SA', 'CA', 'HOD', 'FAC')
  @Post('sessions/:id/rotate')
  rotate(@CampusCtx() campusId: string | null, @Param('id') id: string) {
    return this.attendance.rotate(campusId, id);
  }

  @Post('sessions/:id/scan')
  scan(
    @CampusCtx() campusId: string | null,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ScanDto,
  ) {
    return this.attendance.scan(campusId, user, id, dto);
  }

  @Roles('SA', 'CA', 'HOD', 'FAC')
  @Post('sessions/:id/manual')
  manual(
    @CampusCtx() campusId: string | null,
    @Param('id') id: string,
    @Body() dto: ManualMarkDto,
  ) {
    return this.attendance.manualMark(campusId, id, dto);
  }

  @Roles('SA', 'CA', 'HOD', 'FAC')
  @Post('sessions/:id/close')
  close(@CampusCtx() campusId: string | null, @Param('id') id: string) {
    return this.attendance.close(campusId, id);
  }

  @Get('summary/:studentId')
  summary(@CampusCtx() campusId: string | null, @Param('studentId') studentId: string) {
    return this.attendance.summary(campusId, studentId);
  }
}
