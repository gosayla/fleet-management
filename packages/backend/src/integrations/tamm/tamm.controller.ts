import { Controller, Get, Post, Delete, Param, Body, Headers, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { AuthTokenPayload } from '@fleet/shared';
import { TammClient } from './tamm.client';
import { TammSyncService } from './tamm-sync.service';
import {
  IssueDelegationDto,
  ActualDriverVerifyVehicleBodyDto,
  ActualDriverVerifyAdditionBodyDto,
  ActualDriverFinalSubmitBodyDto,
  ActualDriverRemoveVerifyBodyDto,
} from './tamm.dto';

@ApiTags('tamm')
@ApiBearerAuth()
@Controller('tamm')
@UseGuards(JwtAuthGuard)
export class TammController {
  constructor(
    private readonly tammClient: TammClient,
    private readonly tammSync: TammSyncService,
  ) {}

  @Get('vehicles')
  getVehicles() {
    return this.tammClient.getVehicles();
  }

  @Get('fleet-status')
  getFleetStatus(@CurrentUser() user: AuthTokenPayload) {
    return this.tammSync.getFleetStatus(user.companyId);
  }

  @Get('violations')
  getViolations(@CurrentUser() user: AuthTokenPayload) {
    return this.tammSync.syncViolationsForCompany(user.companyId);
  }

  @Get('violations/:plate')
  getVehicleViolations(
    @CurrentUser() user: AuthTokenPayload,
    @Param('plate') plate: string,
  ) {
    return this.tammSync.syncViolationsForCompany(user.companyId, plate);
  }

  @Post('vehicles/:vehicleId/renew-registration')
  renewRegistration(@Param('vehicleId') vehicleId: string) {
    return this.tammClient.renewRegistration(vehicleId);
  }

  @Get('vehicles/:vehicleId/inspection')
  getInspection(
    @CurrentUser() user: AuthTokenPayload,
    @Param('vehicleId') vehicleId: string,
  ) {
    return this.tammSync.syncVehicleInspection(user.companyId, vehicleId);
  }

  @Get('vehicles/:vehicleId/insurance')
  getInsurance(
    @CurrentUser() user: AuthTokenPayload,
    @Param('vehicleId') vehicleId: string,
  ) {
    return this.tammSync.syncVehicleInsurance(user.companyId, vehicleId);
  }

  @Get('vehicles/:vehicleId/delegations')
  getDelegations(@Param('vehicleId') vehicleId: string) {
    return this.tammClient.getDelegations(vehicleId);
  }

  @Post('vehicles/:vehicleId/delegations')
  issueDelegation(
    @Param('vehicleId') vehicleId: string,
    @Body() dto: IssueDelegationDto,
  ) {
    return this.tammClient.issueDelegation(
      vehicleId,
      dto.delegateName,
      dto.delegateNationalId,
      dto.isInternational,
      dto.validFrom,
      dto.validTo,
    );
  }

  @Delete('vehicles/:vehicleId/delegations/:delegationId')
  cancelDelegation(
    @Param('vehicleId') vehicleId: string,
    @Param('delegationId') delegationId: string,
  ) {
    return this.tammClient.cancelDelegation(vehicleId, delegationId);
  }

  @Post('sync')
  async triggerSync(@CurrentUser() user: AuthTokenPayload) {
    await this.tammSync.syncAllForCompany(user.companyId);
    return { message: 'Tamm sync triggered' };
  }

  // ─── Actual Driver ────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Step 1 — verify vehicle plate before adding actual driver' })
  @Post('actual-driver/verify-vehicle')
  actualDriverVerifyVehicle(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: ActualDriverVerifyVehicleBodyDto,
  ) {
    return this.tammSync.startActualDriverAddition(user.companyId, dto);
  }

  @ApiOperation({ summary: 'Step 2 — verify identity and trigger OTP' })
  @Post('actual-driver/verify-addition')
  actualDriverVerifyAddition(
    @CurrentUser() user: AuthTokenPayload,
    @Headers('x-tamm-conversation-id') conversationId: string,
    @Body() dto: ActualDriverVerifyAdditionBodyDto,
  ) {
    return this.tammSync.continueActualDriverAddition(
      user.companyId,
      conversationId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Step 3 — submit OTP and assign actual driver' })
  @Post('actual-driver/submit')
  actualDriverSubmit(
    @CurrentUser() user: AuthTokenPayload,
    @Headers('x-tamm-conversation-id') conversationId: string,
    @Body() dto: ActualDriverFinalSubmitBodyDto,
  ) {
    return this.tammSync.finalizeActualDriverAddition(
      user.companyId,
      conversationId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Resend OTP (after 2 minutes)' })
  @Get('actual-driver/resend-otp')
  actualDriverResendOtp(
    @CurrentUser() user: AuthTokenPayload,
    @Headers('x-tamm-conversation-id') conversationId: string,
  ) {
    return this.tammSync.resendActualDriverOtp(user.companyId, conversationId);
  }

  @ApiOperation({ summary: 'Cancel Step 1 — verify vehicle for driver removal' })
  @Post('actual-driver/remove/verify')
  actualDriverRemoveVerify(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: ActualDriverRemoveVerifyBodyDto,
  ) {
    return this.tammSync.startActualDriverRemoval(user.companyId, dto);
  }

  @ApiOperation({ summary: 'Cancel Step 2 — remove actual driver' })
  @Delete('actual-driver/remove')
  actualDriverRemove(
    @CurrentUser() user: AuthTokenPayload,
    @Headers('x-tamm-conversation-id') conversationId: string,
    @Query('moveVehicleToCurrentBranch') move = 'false',
  ) {
    return this.tammSync.finalizeActualDriverRemoval(
      user.companyId,
      conversationId,
      move === 'true',
    );
  }
}
