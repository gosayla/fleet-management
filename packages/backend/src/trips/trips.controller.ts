import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto, UpdateTripDto } from './trips.dto';
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
    return this.tripsService.findAll(user.companyId, search);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.tripsService.findOne(user.companyId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateTripDto) {
    return this.tripsService.create(user.companyId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripsService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  cancel(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.tripsService.cancel(user.companyId, id);
  }
}
