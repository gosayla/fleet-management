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
import { ContractsService } from './contracts.service';
import { AddVacationDto, CreateContractDto, UpdateContractDto } from './contracts.dto';

@ApiTags('contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @ApiOperation({ summary: 'List all daily contracts' })
  findAll(
    @CurrentUser() user: AuthTokenPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.contractsService.findAll(user.companyId, page, pageSize, search);
  }

  @Get(':id/trips')
  @ApiOperation({ summary: 'Get contract trips in pages' })
  findTrips(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.contractsService.findTrips(user.companyId, id, skip, take);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single contract detail snapshot' })
  findOne(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.contractsService.findOne(user.companyId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new daily contract and generate trip instances' })
  create(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: CreateContractDto,
  ) {
    return this.contractsService.create(user.companyId, dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update contract details' })
  update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
  ) {
    return this.contractsService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a contract and its pending trips' })
  remove(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.contractsService.remove(user.companyId, id);
  }

  // ─── Trip generation ────────────────────────────────────────────────────────

  @Post(':id/generate-trips')
  @ApiOperation({ summary: 'Re-generate all pending daily trips for a contract' })
  generateTrips(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
  ) {
    return this.contractsService.generateTrips(user.companyId, id);
  }

  // ─── Vacations / excluded dates ──────────────────────────────────────────────

  @Post(':id/vacations')
  @ApiOperation({ summary: 'Add an excluded date (vacation/holiday) to a contract' })
  addVacation(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dto: AddVacationDto,
  ) {
    return this.contractsService.addVacation(user.companyId, id, dto);
  }

  @Delete(':id/vacations/:vacationId')
  @ApiOperation({ summary: 'Remove an excluded date and restore the trip for that day' })
  removeVacation(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Param('vacationId') vacationId: string,
  ) {
    return this.contractsService.removeVacation(user.companyId, id, vacationId);
  }
}
