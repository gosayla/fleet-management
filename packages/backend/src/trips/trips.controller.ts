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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto, TripLocationDto, UpdateTripDto } from './trips.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload } from '@fleet/shared';

@ApiTags('trips')
@ApiBearerAuth()
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthTokenPayload,
    @Query('search') search?: string,
  ) {
    return this.tripsService.findAll(user.companyId, user, search);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.tripsService.findOne(user.companyId, id, user);
  }

  @Post()
  create(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateTripDto) {
    if (user.role === 'DRIVER') {
      throw new ForbiddenException('ليس لديك صلاحية إنشاء رحلة');
    }
    return this.tripsService.create(user.companyId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripsService.update(user.companyId, id, dto, user);
  }

  @Delete(':id')
  cancel(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    if (user.role === 'DRIVER') {
      throw new ForbiddenException('ليس لديك صلاحية إلغاء الرحلة');
    }
    return this.tripsService.cancel(user.companyId, id);
  }

  // ─── GPS Location Tracking ─────────────────────────────────────────────────

  @Post(':id/locations')
  addLocation(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dto: TripLocationDto,
  ) {
    return this.tripsService.addLocation(user.companyId, id, dto, user);
  }

  @Post(':id/locations/batch')
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
