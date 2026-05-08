import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@fleet/shared';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import { AuthTokenPayload } from '@fleet/shared';
import { PilotSyncService } from './pilot-sync.service';

class PilotTokenDto {
  token?: string;
}

@ApiTags('pilot-gps')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pilot-gps')
export class PilotController {
  constructor(private readonly pilotSync: PilotSyncService) {}

  @Get('devices')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER, UserRole.VIEWER)
  getDevices(@Query('token') token?: string) {
    return this.pilotSync.getDevices(token);
  }

  @Post('sync')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER)
  syncCompany(@CurrentUser() user: AuthTokenPayload, @Body() body: PilotTokenDto) {
    return this.pilotSync.syncCompanyVehicles(user.companyId, body?.token);
  }
}
