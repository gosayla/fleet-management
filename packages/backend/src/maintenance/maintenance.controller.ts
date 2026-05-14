import { Controller, Delete, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MaintenanceService, CreateMaintenanceDto, UpdateMaintenanceDto } from './maintenance.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload, MaintenanceStatus, UserRole } from '@fleet/shared';
import { Roles } from '../auth/roles.decorator';

@ApiTags('maintenance')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER, UserRole.VIEWER, UserRole.MAINTENANCE_TECH)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER, UserRole.VIEWER, UserRole.MAINTENANCE_TECH, UserRole.DRIVER)
  findAll(
    @CurrentUser() user: AuthTokenPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: MaintenanceStatus,
  ) {
    return this.maintenanceService.findAll(user.companyId, page, pageSize, search, status, user);
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
