import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto, UpdateDriverDto } from './drivers.dto';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, search?: string) {
    return this.prisma.driver.findMany({
      where: {
        companyId,
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { nationalId: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { assignedVehicle: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id, companyId },
      include: {
        assignedVehicle: true,
        trips: { orderBy: { scheduledStart: 'desc' }, take: 5 },
        documents: true,
      },
    });
    if (!driver) throw new NotFoundException(`السائق ${id} غير موجود`);
    return driver;
  }

  async create(companyId: string, dto: CreateDriverDto) {
    return this.prisma.driver.create({
      data: { ...dto, companyId },
    });
  }

  async update(companyId: string, id: string, dto: UpdateDriverDto) {
    await this.findOne(companyId, id);
    return this.prisma.driver.update({
      where: { id },
      data: dto,
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.driver.update({
      where: { id },
      data: { status: 'TERMINATED' },
    });
  }
}
