import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TripsService } from './trips.service';
import { CreateTripDto, TripLocationDto, UpdateTripDto } from './trips.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload, TripStatus, UserRole } from '@fleet/shared';
import { Roles } from '../auth/roles.decorator';

type TripScope = 'all' | 'standalone' | 'contract';

@ApiTags('trips')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER, UserRole.VIEWER, UserRole.DRIVER)
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthTokenPayload,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: TripStatus,
    @Query('scope') scope?: TripScope,
  ) {
    return this.tripsService.findAll(
      user.companyId,
      user,
      search,
      page,
      pageSize,
      status,
      scope,
    );
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.tripsService.findOne(user.companyId, id, user);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER)
  create(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateTripDto) {
    if (user.role === 'DRIVER') {
      throw new ForbiddenException('ليس لديك صلاحية إنشاء رحلة');
    }
    return this.tripsService.create(user.companyId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER, UserRole.DRIVER)
  update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripsService.update(user.companyId, id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER)
  cancel(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    if (user.role === 'DRIVER') {
      throw new ForbiddenException('ليس لديك صلاحية إلغاء الرحلة');
    }
    return this.tripsService.cancel(user.companyId, id);
  }

  // ─── GPS Location Tracking ─────────────────────────────────────────────────

  @Post(':id/locations')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER, UserRole.DRIVER)
  addLocation(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dto: TripLocationDto,
  ) {
    return this.tripsService.addLocation(user.companyId, id, dto, user);
  }

  @Post(':id/locations/batch')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER, UserRole.DRIVER)
  addLocationsBatch(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dtos: TripLocationDto[],
  ) {
    return this.tripsService.addLocationsBatch(user.companyId, id, dtos, user);
  }

  @Get(':id/locations')
  getLocations(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.tripsService.getLocations(user.companyId, id, user);
  }
}
