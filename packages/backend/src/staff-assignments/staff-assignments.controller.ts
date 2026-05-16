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
import { AuthTokenPayload } from '@fleet/shared';
import { StaffAssignmentsService } from './staff-assignments.service';
import {
  CreateStaffAssignmentDto,
  ReturnStaffVehicleDto,
  UpdateStaffAssignmentDto,
} from './staff-assignments.dto';

@ApiTags('staff-assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('staff-assignments')
export class StaffAssignmentsController {
  constructor(private readonly service: StaffAssignmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all staff vehicle assignments' })
  findAll(
    @CurrentUser() user: AuthTokenPayload,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.service.findAll(user.companyId, vehicleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single staff assignment' })
  findOne(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.service.findOne(user.companyId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Assign a staff vehicle to an employee' })
  create(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: CreateStaffAssignmentDto,
  ) {
    return this.service.create(user.companyId, dto);
  }

  @Post(':id/return')
  @ApiOperation({ summary: 'Mark a staff vehicle as returned' })
  returnVehicle(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dto: ReturnStaffVehicleDto,
  ) {
    return this.service.returnVehicle(user.companyId, id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a staff assignment' })
  update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateStaffAssignmentDto,
  ) {
    return this.service.update(user.companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a staff assignment record' })
  remove(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.service.remove(user.companyId, id);
  }
}
