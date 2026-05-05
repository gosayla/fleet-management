import { Controller, Delete, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MaintenanceService, CreateMaintenanceDto, UpdateMaintenanceDto } from './maintenance.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload } from '@fleet/shared';

@ApiTags('maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get() findAll(@CurrentUser() user: AuthTokenPayload) {
    return this.maintenanceService.findAll(user.companyId);
  }

  @Get(':id') findOne(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.maintenanceService.findOne(user.companyId, id);
  }

  @Post() create(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateMaintenanceDto) {
    return this.maintenanceService.create(user.companyId, dto);
  }

  @Patch(':id') update(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string, @Body() dto: UpdateMaintenanceDto) {
    return this.maintenanceService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.maintenanceService.remove(user.companyId, id);
  }
}
