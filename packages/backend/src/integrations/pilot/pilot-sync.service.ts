import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PilotClient, PilotDevice } from './pilot.client';
import { FleetGateway } from '../../gateway/fleet.gateway';
import { VehicleLocationUpdate } from '@fleet/shared';

function normalizePlate(input: string): string {
  return String(input ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

@Injectable()
export class PilotSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pilotClient: PilotClient,
    private readonly fleetGateway: FleetGateway,
  ) {}

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
      await this.prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
          lastLocationLat: match.lat,
          lastLocationLng: match.lng,
          lastLocationAt: match.recordedAt,
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
