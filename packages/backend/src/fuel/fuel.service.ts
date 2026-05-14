import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AuthTokenPayload, PaginatedResult } from '@fleet/shared';
import { Prisma } from '@prisma/client';

export class CreateFuelLogDto {
  @ApiProperty() @IsString() @IsNotEmpty() vehicleId: string;
  @ApiPropertyOptional() @IsString() @IsOptional() driverId?: string;
  @ApiProperty({ example: 50 }) @IsNumber() @Min(1) liters: number;
  @ApiProperty({ example: 275.5 }) @IsNumber() @Min(0) costSar: number;
  @ApiProperty({ example: 45200 }) @IsNumber() @Min(0) odometer: number;
  @ApiPropertyOptional({ example: 'ADNOC Station — King Fahd Rd' }) @IsString() @IsOptional() station?: string;
  @ApiProperty() @Type(() => Date) @IsDate() filledAt: Date;
}

@Injectable()
export class FuelService {
  constructor(private readonly prisma: PrismaService) {}

  private async getDriverVehicleIds(companyId: string, userId: string): Promise<string[]> {
    const driver = await this.prisma.driver.findFirst({
      where: {companyId, userId},
      select: {vehicles: {select: {id: true}}},
    });

    return driver?.vehicles.map((vehicle) => vehicle.id) ?? [];
  }

  async findAll(
    companyId: string,
    page?: string,
    pageSize?: string,
    search?: string,
    user?: AuthTokenPayload,
  ): Promise<any[] | PaginatedResult<any>> {
    const driverVehicleIds = user?.role === 'DRIVER'
      ? await this.getDriverVehicleIds(companyId, user.sub)
      : null;

    if (user?.role === 'DRIVER' && (!driverVehicleIds || driverVehicleIds.length === 0)) {
      if (page == null && pageSize == null) {
        return [];
      }

      const normalizedPageSize = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
      const normalizedPage = Math.max(Number(page) || 1, 1);
      return {data: [], total: 0, page: normalizedPage, pageSize: normalizedPageSize, totalPages: 0};
    }

    const where = {
      companyId,
      ...(driverVehicleIds ? {vehicleId: {in: driverVehicleIds}} : {}),
      ...(search?.trim()
        ? {
            OR: [
              { station: { contains: search.trim(), mode: 'insensitive' as const } },
              { vehicle: { plateNumber: { contains: search.trim(), mode: 'insensitive' as const } } },
              { vehicle: { make: { contains: search.trim(), mode: 'insensitive' as const } } },
              { vehicle: { model: { contains: search.trim(), mode: 'insensitive' as const } } },
              { driver: { fullName: { contains: search.trim(), mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const query = {
      where,
      include: { vehicle: true, driver: true },
      orderBy: { filledAt: 'desc' },
    } satisfies Prisma.FuelLogFindManyArgs;

    if (page == null && pageSize == null) {
      return this.prisma.fuelLog.findMany(query);
    }

    const normalizedPageSize = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const normalizedPage = Math.max(Number(page) || 1, 1);
    const skip = (normalizedPage - 1) * normalizedPageSize;

    return Promise.all([
      this.prisma.fuelLog.findMany({...query, skip, take: normalizedPageSize}),
      this.prisma.fuelLog.count({where}),
    ]).then(([data, total]) => ({
      data,
      total,
      page: normalizedPage,
      pageSize: normalizedPageSize,
      totalPages: Math.max(1, Math.ceil(total / normalizedPageSize)),
    }));
  }

  findOne(companyId: string, id: string) {
    return this.prisma.fuelLog.findFirstOrThrow({
      where: { id, companyId },
      include: { vehicle: true, driver: true },
    });
  }

  findByVehicle(companyId: string, vehicleId: string) {
    return this.prisma.fuelLog.findMany({
      where: { companyId, vehicleId },
      orderBy: { filledAt: 'desc' },
    });
  }

  create(companyId: string, dto: CreateFuelLogDto) {
    return this.prisma.fuelLog.create({ data: { ...dto, companyId } });
  }

  async remove(companyId: string, id: string) {
    await this.prisma.fuelLog.findFirstOrThrow({ where: { id, companyId } });
    return this.prisma.fuelLog.delete({ where: { id } });
  }

  async getMonthlyReport(companyId: string) {
    const result = await this.prisma.fuelLog.groupBy({
      by: ['vehicleId'],
      where: { companyId },
      _sum: { liters: true, costSar: true },
      _count: { id: true },
    });
    return result;
  }
}
