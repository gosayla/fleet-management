import { Controller, Get, Post, Delete, Body, Param, HttpCode, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FuelService, CreateFuelLogDto } from './fuel.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload, UserRole } from '@fleet/shared';
import { Roles } from '../auth/roles.decorator';

@ApiTags('fuel')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER, UserRole.VIEWER)
@Controller('fuel')
export class FuelController {
  constructor(private readonly fuelService: FuelService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER, UserRole.VIEWER, UserRole.DRIVER)
  findAll(
    @CurrentUser() user: AuthTokenPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.fuelService.findAll(user.companyId, page, pageSize, search, user);
  }

  @Get('report') getReport(@CurrentUser() user: AuthTokenPayload) {
    return this.fuelService.getMonthlyReport(user.companyId);
  }

  @Get(':id') findOne(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.fuelService.findOne(user.companyId, id);
  }

  @Get('vehicle/:vehicleId') findByVehicle(@CurrentUser() user: AuthTokenPayload, @Param('vehicleId') vehicleId: string) {
    return this.fuelService.findByVehicle(user.companyId, vehicleId);
  }

  @Post() @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER) create(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateFuelLogDto) {
    return this.fuelService.create(user.companyId, dto);
  }

  @Delete(':id') @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER) @HttpCode(204) remove(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.fuelService.remove(user.companyId, id);
  }
}
