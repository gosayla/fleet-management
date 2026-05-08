import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PilotClient, PilotDevice } from './pilot.client';
import { FleetGateway } from '../../gateway/fleet.gateway';
import { VehicleLocationUpdate } from '@fleet/shared';

function normalizePlate(input: string): string {
  return String(input ?? '')
    .trim()
    // Normalize all Arabic Alef variants → plain Alef (ا)
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

@Injectable()
export class PilotSyncService {
  private readonly logger = new Logger(PilotSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pilotClient: PilotClient,
    private readonly fleetGateway: FleetGateway,
    private readonly config: ConfigService,
  ) {}

  /** Auto-sync every 5 minutes using the global env token across all companies */
  @Cron('*/5 * * * *')
  async scheduledSync() {
    const token = this.config.get<string>('PILOT_GPS_TOKEN', '');
    if (!token) return;

    try {
      const companies = await this.prisma.company.findMany({ select: { id: true } });
      for (const company of companies) {
        await this.syncCompanyVehicles(company.id, token);
      }
    } catch (err) {
      this.logger.error('Pilot auto-sync failed', err);
    }
  }

  async getDevices(token?: string) {
    return this.pilotClient.fetchDevices(token);
  }

  async syncCompanyVehicles(companyId: string, token?: string) {
    const [devices, vehicles] = await Promise.all([
      this.pilotClient.fetchDevices(token),
      this.prisma.vehicle.findMany({
        where: { companyId },
        select: { id: true, plateNumber: true },
      }),
    ]);

    const byPlate = new Map<string, PilotDevice>();
    for (const device of devices) {
      byPlate.set(normalizePlate(device.plateNumber), device);
    }

    const unmatchedProviderDevices: string[] = [];
    const matchedVehicleIds = new Set<string>();
    let updated = 0;

    for (const vehicle of vehicles) {
      const match = byPlate.get(normalizePlate(vehicle.plateNumber));
      if (!match) continue;

      matchedVehicleIds.add(vehicle.id);

      // Only include telemetry fields that have real (non-zero) values
      // to avoid overwriting good data with zeros when device has no signal
      const telemetryData: Record<string, unknown> = {};
      if (match.deviceImei) telemetryData.pilotImei = match.deviceImei;
      if (match.motorHoursSeconds) telemetryData.pilotMotorHours = match.motorHoursSeconds / 3600;
      if (match.lastStop) telemetryData.pilotLastStop = match.lastStop;
      if (match.lastMove) telemetryData.pilotLastMove = match.lastMove;
      if (match.batteryVoltage != null && match.batteryVoltage > 0) telemetryData.pilotBatteryVoltage = match.batteryVoltage;
      if (match.ignitionOn != null) telemetryData.pilotIgnitionOn = match.ignitionOn;
      if (match.loadWeight != null && match.loadWeight > 0) telemetryData.pilotLoadWeight = match.loadWeight;
      if (match.providerMileage != null && match.providerMileage > 0) telemetryData.pilotProviderMileage = match.providerMileage;

      // Only update location fields when provider has a valid GPS fix
      if (match.lat !== null && match.lng !== null) {
        await this.prisma.vehicle.update({
          where: { id: vehicle.id },
          data: {
            lastLocationLat: match.lat,
            lastLocationLng: match.lng,
            lastLocationAt: match.recordedAt,
            ...telemetryData,
          },
        });

        const eventPayload: VehicleLocationUpdate = {
          vehicleId: vehicle.id,
          driverId: '',
          location: { lat: match.lat, lng: match.lng },
          speed: match.speed,
          heading: match.heading,
          timestamp: match.recordedAt,
        };

        this.fleetGateway.server?.emit('vehicle:location', eventPayload);
        updated += 1;
      } else {
        // No GPS fix — still persist telemetry without overwriting stored location
        await this.prisma.vehicle.update({
          where: { id: vehicle.id },
          data: telemetryData,
        });
      }
    }

    const knownPlates = new Set(vehicles.map((v) => normalizePlate(v.plateNumber)));
    for (const device of devices) {
      if (!knownPlates.has(normalizePlate(device.plateNumber))) {
        unmatchedProviderDevices.push(device.plateNumber);
      }
    }

    const notUpdatedVehicles = vehicles
      .filter((v) => !matchedVehicleIds.has(v.id))
      .map((v) => v.plateNumber);

    return {
      sourceCount: devices.length,
      companyVehicleCount: vehicles.length,
      updated,
      unmatchedProviderDevices,
      notUpdatedVehicles,
    };
  }
}
