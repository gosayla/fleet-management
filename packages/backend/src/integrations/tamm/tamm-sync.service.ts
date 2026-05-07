import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { TammClient } from './tamm.client';
import {
  ActualDriverFinalSubmitBodyDto,
  ActualDriverRemoveVerifyBodyDto,
  ActualDriverVerifyAdditionBodyDto,
  ActualDriverVerifyVehicleBodyDto,
} from './tamm.dto';

/**
 * Tamm Sync Service
 * Periodically syncs vehicle data and violations from Tamm into the local DB.
 */
@Injectable()
export class TammSyncService {
  private readonly logger = new Logger(TammSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tammClient: TammClient,
  ) {}

  private toSyncFailure(scope: string, err: unknown, vehicle?: string) {
    if (err instanceof HttpException) {
      return {
        scope,
        vehicle,
        statusCode: err.getStatus(),
        response: err.getResponse(),
      };
    }

    const message = err instanceof Error ? err.message : 'Unknown sync error';
    return {
      scope,
      vehicle,
      statusCode: HttpStatus.BAD_GATEWAY,
      response: { message },
    };
  }

  async startActualDriverAddition(
    companyId: string,
    dto: ActualDriverVerifyVehicleBodyDto,
  ) {
    await this.assertVehicle(companyId, dto.vehicleId);
    await this.assertDriver(companyId, dto.driverId);

    const result = await this.tammClient.actualDriverVerifyVehicle({
      plateDto: dto.plateDto,
    });

    await this.prisma.tammActualDriverSession.upsert({
      where: { conversationId: result.conversationId },
      create: {
        companyId,
        vehicleId: dto.vehicleId,
        driverId: dto.driverId,
        conversationId: result.conversationId,
        action: 'addition',
        status: 'verified',
      },
      update: {
        vehicleId: dto.vehicleId,
        driverId: dto.driverId,
        status: 'verified',
      },
    });

    return result;
  }

  async continueActualDriverAddition(
    companyId: string,
    conversationId: string,
    dto: ActualDriverVerifyAdditionBodyDto,
  ) {
    const session = await this.requireActualDriverSession(
      companyId,
      conversationId,
      'addition',
    );
    await this.assertDriver(companyId, dto.driverId);

    await this.tammClient.actualDriverVerifyAddition(conversationId, {
      type: dto.type,
      idNumber: dto.idNumber,
      birthYear: dto.birthYear,
      crossValidationBy: dto.crossValidationBy,
      crossValidationPlateDto: dto.crossValidationPlateDto,
      residentIqamaId: dto.residentIqamaId,
      mobileNumber: dto.mobileNumber,
    });

    await this.prisma.tammActualDriverSession.update({
      where: { id: session.id },
      data: {
        driverId: dto.driverId ?? session.driverId,
        status: 'identity_verified',
      },
    });
  }

  async finalizeActualDriverAddition(
    companyId: string,
    conversationId: string,
    dto: ActualDriverFinalSubmitBodyDto,
  ) {
    const session = await this.requireActualDriverSession(
      companyId,
      conversationId,
      'addition',
    );
    await this.assertVehicle(companyId, dto.vehicleId ?? undefined);
    await this.assertDriver(companyId, dto.driverId ?? undefined);

    const result = await this.tammClient.actualDriverFinalSubmit(conversationId, {
      otp: dto.otp,
    });

    const vehicleId = dto.vehicleId ?? session.vehicleId;
    const driverId = dto.driverId ?? session.driverId;
    let assignmentUpdated = false;

    if (vehicleId && driverId) {
      await this.assignDriverToVehicle(companyId, vehicleId, driverId);
      assignmentUpdated = true;
    }

    await this.prisma.tammActualDriverSession.update({
      where: { id: session.id },
      data: {
        vehicleId,
        driverId,
        status: 'completed',
        referenceNumber: result.referenceNumber.toString(),
      },
    });

    return { ...result, assignmentUpdated };
  }

  async resendActualDriverOtp(
    companyId: string,
    conversationId: string,
  ) {
    await this.requireActualDriverSession(companyId, conversationId, 'addition');
    await this.tammClient.actualDriverResendOtp(conversationId);
  }

  async startActualDriverRemoval(
    companyId: string,
    dto: ActualDriverRemoveVerifyBodyDto,
  ) {
    await this.assertVehicle(companyId, dto.vehicleId);
    const result = await this.tammClient.actualDriverRemoveVerify(dto.plateDto);

    await this.prisma.tammActualDriverSession.upsert({
      where: { conversationId: result.conversationId },
      create: {
        companyId,
        vehicleId: dto.vehicleId,
        conversationId: result.conversationId,
        action: 'removal',
        status: 'verified',
      },
      update: {
        vehicleId: dto.vehicleId,
        status: 'verified',
      },
    });

    return result;
  }

  async finalizeActualDriverRemoval(
    companyId: string,
    conversationId: string,
    moveVehicleToCurrentBranch = false,
  ) {
    const session = await this.requireActualDriverSession(
      companyId,
      conversationId,
      'removal',
    );

    await this.tammClient.actualDriverRemove(
      conversationId,
      moveVehicleToCurrentBranch,
    );

    let assignmentUpdated = false;
    if (session.vehicleId) {
      await this.clearVehicleAssignment(companyId, session.vehicleId);
      assignmentUpdated = true;
    }

    await this.prisma.tammActualDriverSession.update({
      where: { id: session.id },
      data: { status: 'completed' },
    });

    return { success: true, assignmentUpdated };
  }

  async getFleetStatus(companyId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        companyId,
        sequenceNumber: { not: null },
      },
      select: {
        id: true,
        plateNumber: true,
        make: true,
        model: true,
        year: true,
        sequenceNumber: true,
        tammVehicleId: true,
        licenseExpiryDate: true,
        inspectionExpiryDate: true,
        insuranceExpiryDate: true,
        mvpiStatus: true,
        insuranceStatus: true,
        status: true,
      },
      orderBy: { plateNumber: 'asc' },
    });

    const violations = await this.prisma.tammViolation.findMany({
      where: { companyId },
      orderBy: { issuedAt: 'desc' },
    });

    const lastSync = await this.prisma.tammSyncLog.findFirst({
      where: { companyId },
      orderBy: { id: 'desc' },
    });

    return { vehicles, violations, lastSync };
  }

  async syncViolationsForCompany(companyId: string, plateNumber?: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { vehicles: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const violations = await this.tammClient.getViolations(plateNumber);

    for (const violation of violations) {
      const vehicle = company.vehicles.find(
        (item) =>
          (violation.vehicleId && item.sequenceNumber === violation.vehicleId) ||
          item.plateNumber === violation.plateNumber,
      );

      if (!vehicle) continue;

      await this.prisma.tammViolation.upsert({
        where: { violationId: violation.violationId },
        create: {
          companyId,
          vehicleId: vehicle.id,
          violationId: violation.violationId,
          plateNumber: violation.plateNumber,
          description: violation.description,
          amount: violation.amount,
          issuedAt: violation.issuedAt,
          location: violation.location,
          isPaid: violation.isPaid,
        },
        update: {
          vehicleId: vehicle.id,
          plateNumber: violation.plateNumber,
          description: violation.description,
          amount: violation.amount,
          issuedAt: violation.issuedAt,
          location: violation.location,
          isPaid: violation.isPaid,
          syncedAt: new Date(),
        },
      });
    }

    await this.prisma.tammSyncLog.create({
      data: {
        companyId,
        syncType: plateNumber ? 'violations:plate' : 'violations',
        status: 'success',
        recordCount: violations.length,
      },
    });

    return violations;
  }

  async syncVehicleInspection(companyId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const query = vehicle.sequenceNumber
      ? { searchType: 1 as const, sequenceNumber: vehicle.sequenceNumber }
      : this.buildPlateLookup(vehicle.plateNumber);

    const result = await this.tammClient.getMvpiStatus(query);

    await this.prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        sequenceNumber: result.sequenceNumber?.toString() || vehicle.sequenceNumber,
        inspectionExpiryDate: result.mvpiExpiryDate,
        mvpiStatus: result.mvpiStatus,
        odometer: result.odometer ?? vehicle.odometer,
      },
    });

    await this.prisma.tammSyncLog.create({
      data: {
        companyId,
        syncType: 'inspection',
        status: 'success',
        recordCount: 1,
      },
    });

    return result;
  }

  async syncVehicleInsurance(companyId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const query = vehicle.sequenceNumber
      ? { searchType: 1 as const, sequenceNumber: vehicle.sequenceNumber }
      : this.buildPlateLookup(vehicle.plateNumber);

    const result = await this.tammClient.getInsurance(query);
    const latestPolicy = [...result.list]
      .sort((left, right) => right.policyEndDate.localeCompare(left.policyEndDate))[0];
    const insuranceExpiryDate = latestPolicy?.policyEndDate ?? null;

    let insuranceStatus = 'NOT_EXIST';
    if (latestPolicy) {
      const policyEnd = new Date(latestPolicy.policyEndDate);
      insuranceStatus = Number.isNaN(policyEnd.getTime()) || policyEnd >= new Date()
        ? 'VALID'
        : 'EXPIRED';
    }

    await this.prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        sequenceNumber: result.plate?.number ? vehicle.sequenceNumber : vehicle.sequenceNumber,
        insuranceStatus,
        insuranceExpiryDate,
      },
    });

    await this.prisma.tammSyncLog.create({
      data: {
        companyId,
        syncType: 'insurance',
        status: 'success',
        recordCount: result.list.length,
      },
    });

    return result;
  }

  private buildPlateLookup(plateNumber: string) {
    const parts = plateNumber.trim().split(/\s+/);
    const letters = parts[0] ?? '';
    const parsedNumber = parseInt(parts[1] ?? '', 10);

    if (letters.length < 3 || Number.isNaN(parsedNumber)) {
      throw new BadRequestException(
        'Vehicle is missing a Tamm sequence number and plateNumber is not in a Tamm-compatible format',
      );
    }

    return {
      searchType: 0 as const,
      plate: {
        text1: letters[0] ?? '',
        text2: letters[1] ?? '',
        text3: letters[2] ?? '',
        number: parsedNumber,
        type: { code: 1 },
      },
    };
  }

  private async requireActualDriverSession(
    companyId: string,
    conversationId: string,
    action: 'addition' | 'removal',
  ) {
    const session = await this.prisma.tammActualDriverSession.findFirst({
      where: { companyId, conversationId, action },
    });

    if (!session) {
      throw new NotFoundException('Tamm actual driver session not found');
    }

    return session;
  }

  private async assertVehicle(companyId: string, vehicleId?: string) {
    if (!vehicleId) return;
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId },
      select: { id: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
  }

  private async assertDriver(companyId: string, driverId?: string) {
    if (!driverId) return;
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId, companyId },
      select: { id: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }
  }

  private async assignDriverToVehicle(
    companyId: string,
    vehicleId: string,
    driverId: string,
  ) {
    // Verify both belong to the company
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, companyId }, select: { id: true } });
    const driver = await this.prisma.driver.findFirst({ where: { id: driverId, companyId }, select: { id: true } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (!driver) throw new NotFoundException('Driver not found');

    // Connect via many-to-many (idempotent)
    await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { drivers: { connect: { id: driverId } } },
    });
  }

  private async clearVehicleAssignment(companyId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId },
      select: { id: true, drivers: { select: { id: true } } },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Disconnect all drivers from this vehicle
    await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { drivers: { disconnect: vehicle.drivers } },
    });
  }

  /**
   * Full sync for a single company: violations + MVPI + insurance for every vehicle.
   * Called by the manual POST /tamm/sync endpoint.
   */
  async syncAllForCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { vehicles: true },
    });

    if (!company) throw new NotFoundException('Company not found');

    const failures: Array<{
      scope: string;
      vehicle?: string;
      statusCode: number;
      response: unknown;
    }> = [];

    // 1. Violations
    await this.syncViolationsForCompany(companyId).catch((err) => {
      this.logger.error(`Violations sync failed: ${(err as Error).message}`);
      failures.push(this.toSyncFailure('violations', err));
    });

    // 2. Per-vehicle inspection + insurance
    for (const vehicle of company.vehicles) {
      await this.syncVehicleInspection(companyId, vehicle.id).catch((err) => {
        this.logger.warn(`MVPI sync failed for ${vehicle.plateNumber}: ${(err as Error).message}`);
        failures.push(this.toSyncFailure('inspection', err, vehicle.plateNumber));
      });
      await this.syncVehicleInsurance(companyId, vehicle.id).catch((err) => {
        this.logger.warn(`Insurance sync failed for ${vehicle.plateNumber}: ${(err as Error).message}`);
        failures.push(this.toSyncFailure('insurance', err, vehicle.plateNumber));
      });
    }

    if (failures.length > 0) {
      const summary = failures.reduce<Record<string, number>>((acc, failure) => {
        acc[failure.scope] = (acc[failure.scope] ?? 0) + 1;
        return acc;
      }, {});

      throw new HttpException(
        {
          message: 'Tamm sync failed',
          totalFailures: failures.length,
          summary,
          samples: failures.slice(0, 5),
        },
        failures[0]?.statusCode ?? HttpStatus.BAD_GATEWAY,
      );
    }

    this.logger.log(`Tamm full sync complete for company ${companyId} (${company.vehicles.length} vehicles)`);
  }

  /** Sync Tamm vehicles for all companies */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async syncVehicles() {
    this.logger.log('Tamm: starting vehicle sync');
    const companies = await this.prisma.company.findMany({});

    for (const company of companies) {
      try {
        const tammVehicles = await this.tammClient.getVehicles();

        for (const tv of tammVehicles) {
          await this.prisma.vehicle.updateMany({
            where: { companyId: company.id, plateNumber: tv.plateNumber },
            data: { tammVehicleId: tv.vehicleId },
          });
        }

        await this.prisma.tammSyncLog.create({
          data: {
            companyId: company.id,
            syncType: 'vehicles',
            status: 'success',
            recordCount: tammVehicles.length,
          },
        });

        this.logger.log(
          `Tamm: synced ${tammVehicles.length} vehicles for company ${company.id}`,
        );
      } catch (err) {
        this.logger.error(`Tamm vehicle sync failed for company ${company.id}`, err);
        await this.prisma.tammSyncLog.create({
          data: {
            companyId: company.id,
            syncType: 'vehicles',
            status: 'failed',
            error: (err as Error).message,
          },
        });
      }
    }
  }

  /** Sync violations for all company vehicles */
  @Cron(CronExpression.EVERY_6_HOURS)
  async syncViolations() {
    this.logger.log('Tamm: starting violations sync');
    const companies = await this.prisma.company.findMany({});

    for (const company of companies) {
      try {
        await this.syncViolationsForCompany(company.id);
      } catch (err) {
        this.logger.error(`Tamm violations sync failed for company ${company.id}`, err);
        await this.prisma.tammSyncLog.create({
          data: {
            companyId: company.id,
            syncType: 'violations',
            status: 'failed',
            error: (err as Error).message,
          },
        });
      }
    }
  }
}
