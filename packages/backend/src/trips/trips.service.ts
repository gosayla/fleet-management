import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto, TripLocationDto, UpdateTripDto } from './trips.dto';
import { AuthTokenPayload, TripStatus } from '@fleet/shared';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async assertCanWriteLocation(
    companyId: string,
    tripId: string,
    user: AuthTokenPayload,
  ) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, companyId },
      select: { id: true, driverId: true },
    });
    if (!trip) throw new NotFoundException(`الرحلة ${tripId} غير موجودة`);

    // Managers/dispatchers can still write locations for operational overrides.
    if (user.role !== 'DRIVER') return;

    const driver = await this.prisma.driver.findFirst({
      where: { companyId, userId: user.sub },
      select: { id: true },
    });

    if (!driver || driver.id !== trip.driverId) {
      throw new ForbiddenException('لا يمكنك إرسال الموقع لهذه الرحلة');
    }
  }

  private async getDriverIdForUser(companyId: string, userId: string): Promise<string> {
    const driver = await this.prisma.driver.findFirst({
      where: { companyId, userId },
      select: { id: true },
    });
    if (driver) return driver.id;

    // Backward compatibility: older driver users may exist without driver.userId linked.
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: { phone: true, role: true },
    });

    if (!user || user.role !== 'DRIVER') {
      throw new ForbiddenException('حساب السائق غير مرتبط بملف سائق');
    }

    const fallbackDriver = await this.prisma.driver.findFirst({
      where: { companyId, phone: user.phone },
      orderBy: { createdAt: 'desc' },
      select: { id: true, userId: true },
    });

    if (fallbackDriver && !fallbackDriver.userId) {
      await this.prisma.driver.update({
        where: { id: fallbackDriver.id },
        data: { userId },
      });
      return fallbackDriver.id;
    }

    throw new ForbiddenException('حساب السائق غير مرتبط بملف سائق');
  }

  async findAll(companyId: string, user: AuthTokenPayload, search?: string) {
    const driverFilter = user.role === 'DRIVER'
      ? { driverId: await this.getDriverIdForUser(companyId, user.sub) }
      : {};

    return this.prisma.trip.findMany({
      where: {
        companyId,
        ...driverFilter,
        ...(search
          ? {
              OR: [
                { origin: { contains: search, mode: 'insensitive' } },
                { destination: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { vehicle: true, driver: true, permit: true },
      orderBy: { scheduledStart: 'desc' },
    });
  }

  async findOne(companyId: string, id: string, user?: AuthTokenPayload) {
    const driverFilter = user?.role === 'DRIVER'
      ? { driverId: await this.getDriverIdForUser(companyId, user.sub) }
      : {};

    const trip = await this.prisma.trip.findFirst({
      where: { id, companyId, ...driverFilter },
      include: { vehicle: true, driver: true, permit: true },
    });
    if (!trip) throw new NotFoundException(`الرحلة ${id} غير موجودة`);
    return trip;
  }

  async create(companyId: string, dto: CreateTripDto) {
    const trip = await this.prisma.trip.create({
      data: { ...dto, companyId },
      include: { vehicle: true, driver: true },
    });
    await this.notificationsService.notifyTripAssigned(companyId, trip.id);
    return trip;
  }

  async update(companyId: string, id: string, dto: UpdateTripDto, user: AuthTokenPayload) {
    const existing = await this.findOne(companyId, id, user);

    const data: Record<string, unknown> = { ...dto };

    if (user.role === 'DRIVER') {
      const allowedStatuses: TripStatus[] = [TripStatus.IN_PROGRESS, TripStatus.COMPLETED];
      if (!dto.status || !allowedStatuses.includes(dto.status)) {
        throw new ForbiddenException('يمكنك فقط بدء أو إنهاء الرحلة');
      }

      Object.keys(data).forEach((key) => {
        if (key !== 'status') {
          delete data[key];
        }
      });
    }

    if (dto.status === 'IN_PROGRESS' && !data.actualStart) {
      data.actualStart = new Date();
    }
    if (dto.status === 'COMPLETED' && !data.actualEnd) {
      data.actualEnd = new Date();
    }

    const updated = await this.prisma.trip.update({
      where: { id },
      data,
      include: { vehicle: true, driver: true },
    });
    if (dto.driverId && dto.driverId !== existing.driverId) {
      await this.notificationsService.notifyTripAssigned(companyId, updated.id);
    }
    if (dto.status === TripStatus.IN_PROGRESS) {
      await this.notificationsService.notifyTripStatus(companyId, updated.id, 'IN_PROGRESS');
    }
    if (dto.status === TripStatus.COMPLETED) {
      await this.notificationsService.notifyTripStatus(companyId, updated.id, 'COMPLETED');
    }
    return updated;
  }

  async cancel(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.trip.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ─── GPS Location Tracking ─────────────────────────────────────────────────

  async addLocation(companyId: string, tripId: string, dto: TripLocationDto, user: AuthTokenPayload) {
    await this.assertCanWriteLocation(companyId, tripId, user);
    return this.prisma.tripLocation.create({
      data: {
        tripId,
        lat: dto.lat,
        lng: dto.lng,
        speed: dto.speed ?? null,
        heading: dto.heading ?? null,
        recordedAt: dto.recordedAt,
      },
    });
  }

  async addLocationsBatch(companyId: string, tripId: string, locations: TripLocationDto[], user: AuthTokenPayload) {
    await this.assertCanWriteLocation(companyId, tripId, user);
    return this.prisma.tripLocation.createMany({
      data: locations.map(dto => ({
        tripId,
        lat: dto.lat,
        lng: dto.lng,
        speed: dto.speed ?? null,
        heading: dto.heading ?? null,
        recordedAt: dto.recordedAt,
      })),
    });
  }

  async getLocations(companyId: string, tripId: string, user: AuthTokenPayload) {
    await this.findOne(companyId, tripId, user);
    return this.prisma.tripLocation.findMany({
      where: { tripId },
      orderBy: { recordedAt: 'asc' },
    });
  }
}
