import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload, UserRole } from '@fleet/shared';
import { RentalsService } from './rentals.service';
import { CreateRentalDto, UpdateRentalDto } from './rentals.dto';
import { Roles } from '../auth/roles.decorator';

@ApiTags('rentals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER, UserRole.VIEWER)
@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Get()
  @ApiOperation({ summary: 'List all vehicle rentals' })
  findAll(
    @CurrentUser() user: AuthTokenPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.rentalsService.findAll(user.companyId, page, pageSize, search, vehicleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single rental record' })
  findOne(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.rentalsService.findOne(user.companyId, id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Create a new vehicle rental' })
  create(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateRentalDto) {
    return this.rentalsService.create(user.companyId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Update rental details or status' })
  update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRentalDto,
  ) {
    return this.rentalsService.update(user.companyId, id, dto);
  }

  @Post(':id/return')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Mark a rental as returned' })
  returnVehicle(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body('odometerIn') odometerIn?: number,
  ) {
    return this.rentalsService.returnVehicle(user.companyId, id, odometerIn);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Delete a rental record' })
  remove(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.rentalsService.remove(user.companyId, id);
  }
}
