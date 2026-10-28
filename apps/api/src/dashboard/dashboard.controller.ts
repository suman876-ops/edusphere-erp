import { Controller, Get } from '@nestjs/common';
import { CampusCtx } from '../common/decorators';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(@CampusCtx() campusId: string | null) {
    return this.dashboard.summary(campusId);
  }
}
