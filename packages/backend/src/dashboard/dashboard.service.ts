import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FleetStats } from '@fleet/shared';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(companyId: string): Promise<FleetStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalVehicles,
      activeVehicles,
      vehiclesInMaintenance,
      totalDrivers,
      activeDrivers,
      tripsToday,
      tripsInProgress,
      fuelCostAgg,
      maintenanceCostAgg,
      pendingViolations,
      expiringDocuments,
    ] = await Promise.all([
      this.prisma.vehicle.count({ where: { companyId } }),
      this.prisma.vehicle.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.vehicle.count({ where: { companyId, status: 'MAINTENANCE' } }),
      this.prisma.driver.count({ where: { companyId } }),
      this.prisma.driver.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.trip.count({
        where: {
          companyId,
          scheduledStart: { gte: startOfToday },
        },
      }),
      this.prisma.trip.count({ where: { companyId, status: 'IN_PROGRESS' } }),
      this.prisma.fuelLog.aggregate({
        where: { companyId, filledAt: { gte: startOfMonth } },
        _sum: { costSar: true },
      }),
      this.prisma.maintenanceLog.aggregate({
        where: { companyId, completedDate: { gte: startOfMonth } },
        _sum: { costSar: true },
      }),
      this.prisma.tammViolation.count({
        where: { companyId, isPaid: false },
      }),
      this.prisma.fleetDocument.count({
        where: {
          companyId,
          expiryDate: { lte: thirtyDaysFromNow, gte: now },
        },
      }),
    ]);

    return {
      totalVehicles,
      activeVehicles,
      vehiclesInMaintenance,
      totalDrivers,
      activeDrivers,
      tripsToday,
      tripsInProgress,
      fuelCostThisMonth: fuelCostAgg._sum.costSar ?? 0,
      maintenanceCostThisMonth: maintenanceCostAgg._sum.costSar ?? 0,
      pendingViolations,
      expiringDocuments,
    };
  }
}
