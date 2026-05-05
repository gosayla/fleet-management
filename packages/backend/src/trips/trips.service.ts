import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto, UpdateTripDto } from './trips.dto';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, search?: string) {
    return this.prisma.trip.findMany({
      where: {
        companyId,
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

  async findOne(companyId: string, id: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id, companyId },
      include: { vehicle: true, driver: true, permit: true },
    });
    if (!trip) throw new NotFoundException(`الرحلة ${id} غير موجودة`);
    return trip;
  }

  async create(companyId: string, dto: CreateTripDto) {
    return this.prisma.trip.create({
      data: { ...dto, companyId },
      include: { vehicle: true, driver: true },
    });
  }

  async update(companyId: string, id: string, dto: UpdateTripDto) {
    await this.findOne(companyId, id);

    const data: Record<string, unknown> = { ...dto };

    if (dto.status === 'IN_PROGRESS' && !data.actualStart) {
      data.actualStart = new Date();
    }
    if (dto.status === 'COMPLETED' && !data.actualEnd) {
      data.actualEnd = new Date();
    }

    return this.prisma.trip.update({
      where: { id },
      data,
      include: { vehicle: true, driver: true },
    });
  }

  async cancel(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.trip.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
