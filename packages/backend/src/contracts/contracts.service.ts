import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddVacationDto, CreateContractDto, UpdateContractDto } from './contracts.dto';
import { AuthTokenPayload } from '@fleet/shared';
import { Prisma, TripLeg, TripStatus, TripType } from '@prisma/client';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private notFound(id: string): never {
    throw new NotFoundException(`العقد ${id} غير موجود`);
  }

  /** Build a Date for a given calendar date string + HH:MM time string (UTC midnight + offset). */
  private buildDatetime(dateStr: string, timeStr: string): Date {
    // dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM'
    const [hh, mm] = timeStr.split(':').map(Number);
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    d.setUTCHours(hh, mm, 0, 0);
    return d;
  }

  /** Enumerate every calendar date [start, end] that should have a trip. */
  private* workingDates(
    start: Date,
    end: Date,
    excludeFridays: boolean,
    excludeSaturdays: boolean,
    excludedDates: Set<string>,
  ): Generator<Date> {
    const cursor = new Date(start);
    cursor.setUTCHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setUTCHours(0, 0, 0, 0);

    while (cursor <= endDay) {
      const dow = cursor.getUTCDay(); // 0=Sun, 5=Fri, 6=Sat
      const key = cursor.toISOString().slice(0, 10);
      if (
        !(excludeFridays && dow === 5) &&
        !(excludeSaturdays && dow === 6) &&
        !excludedDates.has(key)
      ) {
        yield new Date(cursor);
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async findAll(companyId: string) {
    return this.prisma.tripContract.findMany({
      where: { companyId },
      include: {
        vehicle: { select: { id: true, plateNumber: true, make: true, model: true } },
        driver: { select: { id: true, fullName: true, phone: true } },
        vacations: { orderBy: { date: 'asc' } },
        _count: { select: { trips: true } },
      },
      orderBy: { contractStart: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const contract = await this.prisma.tripContract.findFirst({
      where: { id, companyId },
      include: {
        vehicle: { select: { id: true, plateNumber: true, make: true, model: true } },
        driver: { select: { id: true, fullName: true, phone: true } },
        vacations: { orderBy: { date: 'asc' } },
        _count: { select: { trips: true } },
      },
    });
    if (!contract) this.notFound(id);
    return contract;
  }

  async findTrips(companyId: string, id: string, skip?: string, take?: string) {
    const contract = await this.prisma.tripContract.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!contract) this.notFound(id);

    const pageSize = Math.min(Math.max(Number(take) || 20, 1), 100);
    const offset = Math.max(Number(skip) || 0, 0);
    const trips = await this.prisma.trip.findMany({
      where: { companyId, contractId: id },
      orderBy: [{ scheduledStart: 'asc' }, { id: 'asc' }],
      skip: offset,
      take: pageSize + 1,
      select: {
        id: true,
        tripDate: true,
        leg: true,
        scheduledStart: true,
        status: true,
        tripType: true,
        origin: true,
        destination: true,
      },
    });

    const hasMore = trips.length > pageSize;
    const items = hasMore ? trips.slice(0, pageSize) : trips;

    return {
      items,
      nextOffset: hasMore ? offset + items.length : null,
    };
  }

  async create(companyId: string, dto: CreateContractDto, user: AuthTokenPayload) {
    // Validate vehicle & driver belong to company
    const [vehicle, driver] = await Promise.all([
      this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId, companyId }, select: { id: true } }),
      this.prisma.driver.findFirst({ where: { id: dto.driverId, companyId }, select: { id: true } }),
    ]);
    if (!vehicle) throw new BadRequestException('المركبة غير موجودة');
    if (!driver) throw new BadRequestException('السائق غير موجود');

    if (dto.isTwoWay !== false && !dto.returnTime) {
      throw new BadRequestException('يجب تحديد وقت الرجوع للرحلة ذهاب وإياب');
    }

    const contract = await this.prisma.tripContract.create({
      data: {
        companyId,
        vehicleId: dto.vehicleId,
        driverId: dto.driverId,
        clientName: dto.clientName,
        clientPhone: dto.clientPhone,
        contractNumber: dto.contractNumber,
        origin: dto.origin,
        destination: dto.destination,
        contractStart: new Date(dto.contractStart),
        contractEnd: new Date(dto.contractEnd),
        departureTime: dto.departureTime,
        returnTime: dto.returnTime,
        isTwoWay: dto.isTwoWay ?? true,
        excludeFridays: dto.excludeFridays ?? true,
        excludeSaturdays: dto.excludeSaturdays ?? false,
        notes: dto.notes,
      },
    });

    // Auto-generate daily trip instances
    await this.generateTrips(companyId, contract.id);

    return this.findOne(companyId, contract.id);
  }

  async update(companyId: string, id: string, dto: UpdateContractDto) {
    const existing = await this.prisma.tripContract.findFirst({ where: { id, companyId } });
    if (!existing) this.notFound(id);

    await this.prisma.tripContract.update({
      where: { id },
      data: {
        ...(dto.vehicleId && { vehicleId: dto.vehicleId }),
        ...(dto.driverId && { driverId: dto.driverId }),
        ...(dto.clientName && { clientName: dto.clientName }),
        ...(dto.clientPhone !== undefined && { clientPhone: dto.clientPhone }),
        ...(dto.contractNumber !== undefined && { contractNumber: dto.contractNumber }),
        ...(dto.origin && { origin: dto.origin }),
        ...(dto.destination && { destination: dto.destination }),
        ...(dto.contractStart && { contractStart: new Date(dto.contractStart) }),
        ...(dto.contractEnd && { contractEnd: new Date(dto.contractEnd) }),
        ...(dto.departureTime && { departureTime: dto.departureTime }),
        ...(dto.returnTime !== undefined && { returnTime: dto.returnTime }),
        ...(dto.isTwoWay !== undefined && { isTwoWay: dto.isTwoWay }),
        ...(dto.excludeFridays !== undefined && { excludeFridays: dto.excludeFridays }),
        ...(dto.excludeSaturdays !== undefined && { excludeSaturdays: dto.excludeSaturdays }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    return this.findOne(companyId, id);
  }

  async remove(companyId: string, id: string) {
    const existing = await this.prisma.tripContract.findFirst({ where: { id, companyId } });
    if (!existing) this.notFound(id);

    // Delete all SCHEDULED trip instances (don't delete in-progress/completed)
    await this.prisma.trip.deleteMany({
      where: { contractId: id, status: TripStatus.SCHEDULED },
    });

    await this.prisma.tripContract.delete({ where: { id } });
    return { message: 'تم حذف العقد بنجاح' };
  }

  // ─── Vacation management ─────────────────────────────────────────────────────

  async addVacation(companyId: string, contractId: string, dto: AddVacationDto) {
    const contract = await this.prisma.tripContract.findFirst({
      where: { id: contractId, companyId },
    });
    if (!contract) this.notFound(contractId);

    const vacDate = new Date(`${dto.date}T00:00:00.000Z`);

    const vacation = await this.prisma.contractVacation.create({
      data: { contractId, date: vacDate, reason: dto.reason },
    });

    // Delete the SCHEDULED trip(s) for that date
    await this.prisma.trip.deleteMany({
      where: {
        contractId,
        tripDate: {
          gte: new Date(`${dto.date}T00:00:00.000Z`),
          lt: new Date(`${dto.date}T23:59:59.999Z`),
        },
        status: TripStatus.SCHEDULED,
      },
    });

    return vacation;
  }

  async removeVacation(companyId: string, contractId: string, vacationId: string) {
    const contract = await this.prisma.tripContract.findFirst({
      where: { id: contractId, companyId },
      include: { vacations: { where: { id: vacationId } } },
    });
    if (!contract) this.notFound(contractId);
    const vacation = contract.vacations[0];
    if (!vacation) throw new NotFoundException('إجازة غير موجودة');

    await this.prisma.contractVacation.delete({ where: { id: vacationId } });

    // Re-generate trips for the restored date
    await this.generateTripsForDate(
      companyId,
      contractId,
      vacation.date.toISOString().slice(0, 10),
    );

    return { message: 'تم حذف الإجازة وإعادة إنشاء الرحلات' };
  }

  // ─── Trip generation ─────────────────────────────────────────────────────────

  /**
   * (Re-)generate all SCHEDULED daily trip instances for the given contract.
   * Existing SCHEDULED trips are deleted first; IN_PROGRESS / COMPLETED are preserved.
   */
  async generateTrips(companyId: string, contractId: string) {
    const contract = await this.prisma.tripContract.findFirst({
      where: { id: contractId, companyId },
      include: { vacations: true },
    });
    if (!contract) this.notFound(contractId);

    // Remove only future SCHEDULED trips
    await this.prisma.trip.deleteMany({
      where: { contractId, status: TripStatus.SCHEDULED },
    });

    const excludedDates = new Set(
      contract.vacations.map((v) => v.date.toISOString().slice(0, 10)),
    );

    const tripsToCreate: Prisma.TripCreateManyInput[] = [];

    for (const date of this.workingDates(
      contract.contractStart,
      contract.contractEnd,
      contract.excludeFridays,
      contract.excludeSaturdays,
      excludedDates,
    )) {
      const dateStr = date.toISOString().slice(0, 10);
      const depStart = this.buildDatetime(dateStr, contract.departureTime);
      const depEnd = new Date(depStart.getTime() + 2 * 60 * 60 * 1000); // +2h estimate

      tripsToCreate.push({
        companyId,
        vehicleId: contract.vehicleId,
        driverId: contract.driverId,
        contractId,
        tripDate: date,
        leg: TripLeg.OUTBOUND,
        tripType: TripType.DAILY,
        status: TripStatus.SCHEDULED,
        origin: contract.origin,
        destination: contract.destination,
        scheduledStart: depStart,
        scheduledEnd: depEnd,
        clientName: contract.clientName,
        contractNumber: contract.contractNumber,
      });

      if (contract.isTwoWay && contract.returnTime) {
        const retStart = this.buildDatetime(dateStr, contract.returnTime);
        const retEnd = new Date(retStart.getTime() + 2 * 60 * 60 * 1000);

        tripsToCreate.push({
          companyId,
          vehicleId: contract.vehicleId,
          driverId: contract.driverId,
          contractId,
          tripDate: date,
          leg: TripLeg.RETURN,
          tripType: TripType.DAILY,
          status: TripStatus.SCHEDULED,
          origin: contract.destination, // reversed
          destination: contract.origin,
          scheduledStart: retStart,
          scheduledEnd: retEnd,
          clientName: contract.clientName,
          contractNumber: contract.contractNumber,
        });
      }
    }

    if (tripsToCreate.length > 0) {
      await this.prisma.trip.createMany({ data: tripsToCreate });
    }

    return { generated: tripsToCreate.length };
  }

  private async generateTripsForDate(
    companyId: string,
    contractId: string,
    dateStr: string,
  ) {
    const contract = await this.prisma.tripContract.findFirst({
      where: { id: contractId, companyId },
    });
    if (!contract) return;

    const date = new Date(`${dateStr}T00:00:00.000Z`);
    const depStart = this.buildDatetime(dateStr, contract.departureTime);
    const depEnd = new Date(depStart.getTime() + 2 * 60 * 60 * 1000);

    const rows: Prisma.TripCreateManyInput[] = [
      {
        companyId,
        vehicleId: contract.vehicleId,
        driverId: contract.driverId,
        contractId,
        tripDate: date,
        leg: TripLeg.OUTBOUND,
        tripType: TripType.DAILY,
        status: TripStatus.SCHEDULED,
        origin: contract.origin,
        destination: contract.destination,
        scheduledStart: depStart,
        scheduledEnd: depEnd,
        clientName: contract.clientName,
        contractNumber: contract.contractNumber,
      },
    ];

    if (contract.isTwoWay && contract.returnTime) {
      const retStart = this.buildDatetime(dateStr, contract.returnTime);
      const retEnd = new Date(retStart.getTime() + 2 * 60 * 60 * 1000);
      rows.push({
        companyId,
        vehicleId: contract.vehicleId,
        driverId: contract.driverId,
        contractId,
        tripDate: date,
        leg: TripLeg.RETURN,
        tripType: TripType.DAILY,
        status: TripStatus.SCHEDULED,
        origin: contract.destination,
        destination: contract.origin,
        scheduledStart: retStart,
        scheduledEnd: retEnd,
        clientName: contract.clientName,
        contractNumber: contract.contractNumber,
      });
    }

    await this.prisma.trip.createMany({ data: rows });
  }
}
