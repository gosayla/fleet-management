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
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto } from './drivers.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload } from '@fleet/shared';

@ApiTags('drivers')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthTokenPayload,
    @Query('search') search?: string,
  ) {
    return this.driversService.findAll(user.companyId, search);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.driversService.findOne(user.companyId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateDriverDto) {
    return this.driversService.create(user.companyId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.driversService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.driversService.remove(user.companyId, id);
  }
}
