import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRentalDto, UpdateRentalDto } from './rentals.dto';
import { RentalStatus } from '@prisma/client';

@Injectable()
export class RentalsService {
  constructor(private readonly prisma: PrismaService) {}

  private notFound(id: string): never {
    throw new NotFoundException(`الإيجار ${id} غير موجود`);
  }

  async findAll(companyId: string) {
    return this.prisma.vehicleRental.findMany({
      where: { companyId },
      include: {
        vehicle: {
          select: { id: true, plateNumber: true, make: true, model: true, color: true },
        },
      },
      orderBy: { rentalStart: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const rental = await this.prisma.vehicleRental.findFirst({
      where: { id, companyId },
      include: {
        vehicle: {
          select: { id: true, plateNumber: true, make: true, model: true, color: true },
        },
      },
    });
    if (!rental) this.notFound(id);
    return rental;
  }

  async create(companyId: string, dto: CreateRentalDto) {
    // Validate vehicle belongs to company
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, companyId },
      select: { id: true },
    });
    if (!vehicle) throw new BadRequestException('المركبة غير موجودة');

    const rentalStart = new Date(dto.rentalStart);
    const rentalEnd = new Date(dto.rentalEnd);

    if (rentalEnd <= rentalStart) {
      throw new BadRequestException('تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء');
    }

    // Check for overlapping active rentals on the same vehicle
    const overlap = await this.prisma.vehicleRental.findFirst({
      where: {
        vehicleId: dto.vehicleId,
        status: { in: [RentalStatus.ACTIVE, RentalStatus.OVERDUE] },
        rentalStart: { lt: rentalEnd },
        rentalEnd: { gt: rentalStart },
      },
    });
    if (overlap) {
      throw new BadRequestException(
        'المركبة محجوزة بالفعل خلال هذه الفترة',
      );
    }

    return this.prisma.vehicleRental.create({
      data: {
        companyId,
        vehicleId: dto.vehicleId,
        clientName: dto.clientName,
        clientPhone: dto.clientPhone,
        clientNationalId: dto.clientNationalId,
        contractNumber: dto.contractNumber,
        rentalStart,
        rentalEnd,
        odometerOut: dto.odometerOut,
        dailyRateSar: dto.dailyRateSar,
        contractFileUrl: dto.contractFileUrl,
        notes: dto.notes,
      },
      include: {
        vehicle: { select: { id: true, plateNumber: true, make: true, model: true } },
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateRentalDto) {
    const existing = await this.prisma.vehicleRental.findFirst({
      where: { id, companyId },
    });
    if (!existing) this.notFound(id);

    return this.prisma.vehicleRental.update({
      where: { id },
      data: {
        ...(dto.clientName && { clientName: dto.clientName }),
        ...(dto.clientPhone !== undefined && { clientPhone: dto.clientPhone }),
        ...(dto.clientNationalId !== undefined && { clientNationalId: dto.clientNationalId }),
        ...(dto.contractNumber !== undefined && { contractNumber: dto.contractNumber }),
        ...(dto.rentalStart && { rentalStart: new Date(dto.rentalStart) }),
        ...(dto.rentalEnd && { rentalEnd: new Date(dto.rentalEnd) }),
        ...(dto.odometerOut !== undefined && { odometerOut: dto.odometerOut }),
        ...(dto.odometerIn !== undefined && { odometerIn: dto.odometerIn }),
        ...(dto.dailyRateSar !== undefined && { dailyRateSar: dto.dailyRateSar }),
        ...(dto.contractFileUrl !== undefined && { contractFileUrl: dto.contractFileUrl }),
        ...(dto.status && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        vehicle: { select: { id: true, plateNumber: true, make: true, model: true } },
      },
    });
  }

  /** Mark a rental as RETURNED and record final odometer. */
  async returnVehicle(companyId: string, id: string, odometerIn?: number) {
    const rental = await this.prisma.vehicleRental.findFirst({
      where: { id, companyId },
    });
    if (!rental) this.notFound(id);
    if (rental.status === RentalStatus.RETURNED) {
      throw new BadRequestException('المركبة أُعيدت مسبقاً');
    }

    return this.prisma.vehicleRental.update({
      where: { id },
      data: {
        status: RentalStatus.RETURNED,
        rentalEnd: new Date(),
        ...(odometerIn !== undefined && { odometerIn }),
      },
      include: {
        vehicle: { select: { id: true, plateNumber: true, make: true, model: true } },
      },
    });
  }

  async remove(companyId: string, id: string) {
    const existing = await this.prisma.vehicleRental.findFirst({
      where: { id, companyId },
    });
    if (!existing) this.notFound(id);

    await this.prisma.vehicleRental.delete({ where: { id } });
    return { message: 'تم حذف الإيجار بنجاح' };
  }

  /** Check if a vehicle is currently rented out (to filter availability). */
  async isVehicleRented(vehicleId: string, asOf: Date = new Date()): Promise<boolean> {
    const count = await this.prisma.vehicleRental.count({
      where: {
        vehicleId,
        status: { in: [RentalStatus.ACTIVE, RentalStatus.OVERDUE] },
        rentalStart: { lte: asOf },
        rentalEnd: { gte: asOf },
      },
    });
    return count > 0;
  }
}
