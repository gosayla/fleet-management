import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload, UserRole } from '@fleet/shared';
import { Roles } from '../auth/roles.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER, UserRole.VIEWER)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@CurrentUser() user: AuthTokenPayload) {
    return this.dashboardService.getStats(user.companyId);
  }
}
