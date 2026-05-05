import { Controller, Get, Post, Delete, Body, Param, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FuelService, CreateFuelLogDto } from './fuel.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload } from '@fleet/shared';

@ApiTags('fuel')
@ApiBearerAuth()
@Controller('fuel')
export class FuelController {
  constructor(private readonly fuelService: FuelService) {}

  @Get() findAll(@CurrentUser() user: AuthTokenPayload) {
    return this.fuelService.findAll(user.companyId);
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

  @Post() create(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateFuelLogDto) {
    return this.fuelService.create(user.companyId, dto);
  }

  @Delete(':id') @HttpCode(204) remove(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.fuelService.remove(user.companyId, id);
  }
}
