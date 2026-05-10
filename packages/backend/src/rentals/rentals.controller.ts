import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload } from '@fleet/shared';
import { RentalsService } from './rentals.service';
import { CreateRentalDto, UpdateRentalDto } from './rentals.dto';

@ApiTags('rentals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Get()
  @ApiOperation({ summary: 'List all vehicle rentals' })
  findAll(@CurrentUser() user: AuthTokenPayload) {
    return this.rentalsService.findAll(user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single rental record' })
  findOne(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.rentalsService.findOne(user.companyId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new vehicle rental' })
  create(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateRentalDto) {
    return this.rentalsService.create(user.companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update rental details or status' })
  update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRentalDto,
  ) {
    return this.rentalsService.update(user.companyId, id, dto);
  }

  @Post(':id/return')
  @ApiOperation({ summary: 'Mark a rental as returned' })
  returnVehicle(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body('odometerIn') odometerIn?: number,
  ) {
    return this.rentalsService.returnVehicle(user.companyId, id, odometerIn);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a rental record' })
  remove(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.rentalsService.remove(user.companyId, id);
  }
}
