import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { MaintenanceType, MaintenanceStatus, PaginatedResult } from '@fleet/shared';
import { Type } from 'class-transformer';
import { Prisma } from '@prisma/client';

export class CreateMaintenanceDto {
  @ApiProperty() @IsString() @IsNotEmpty() vehicleId: string;
  @ApiProperty({ enum: MaintenanceType }) @IsEnum(MaintenanceType) type: MaintenanceType;
  @ApiProperty() @IsString() @IsNotEmpty() description: string;
  @ApiProperty() @Type(() => Date) @IsDate() scheduledDate: Date;
  @ApiPropertyOptional() @IsNumber() @IsOptional() nextServiceKm?: number;
  @ApiPropertyOptional() @Type(() => Date) @IsDate() @IsOptional() nextServiceDate?: Date;
}

export class UpdateMaintenanceDto extends PartialType(CreateMaintenanceDto) {
  @ApiPropertyOptional({ enum: MaintenanceStatus }) @IsEnum(MaintenanceStatus) @IsOptional() status?: MaintenanceStatus;
  @ApiPropertyOptional() @Type(() => Date) @IsDate() @IsOptional() completedDate?: Date;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() costSar?: number;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() odometerAtService?: number;
}

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(
    companyId: string,
    page?: string,
    pageSize?: string,
    search?: string,
    status?: MaintenanceStatus,
  ): Promise<any[] | PaginatedResult<any>> | any[] {
    const where = {
      companyId,
      ...(status ? {status} : {}),
      ...(search?.trim()
        ? {
            OR: [
              { description: { contains: search.trim(), mode: 'insensitive' as const } },
              { vehicle: { plateNumber: { contains: search.trim(), mode: 'insensitive' as const } } },
              { vehicle: { make: { contains: search.trim(), mode: 'insensitive' as const } } },
              { vehicle: { model: { contains: search.trim(), mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const query = {
      where,
      include: { vehicle: true },
      orderBy: { scheduledDate: 'asc' },
    } satisfies Prisma.MaintenanceLogFindManyArgs;

    if (page == null && pageSize == null) {
      return this.prisma.maintenanceLog.findMany(query);
    }

    const normalizedPageSize = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const normalizedPage = Math.max(Number(page) || 1, 1);
    const skip = (normalizedPage - 1) * normalizedPageSize;

    return Promise.all([
      this.prisma.maintenanceLog.findMany({...query, skip, take: normalizedPageSize}),
      this.prisma.maintenanceLog.count({where}),
    ]).then(([data, total]) => ({
      data,
      total,
      page: normalizedPage,
      pageSize: normalizedPageSize,
      totalPages: Math.max(1, Math.ceil(total / normalizedPageSize)),
    }));
  }

  async findOne(companyId: string, id: string) {
    const log = await this.prisma.maintenanceLog.findFirst({
      where: { id, companyId },
      include: { vehicle: true },
    });
    if (!log) throw new NotFoundException(`سجل الصيانة ${id} غير موجود`);
    return log;
  }

  create(companyId: string, dto: CreateMaintenanceDto) {
    return this.prisma.maintenanceLog.create({ data: { ...dto, companyId } });
  }

  async update(companyId: string, id: string, dto: UpdateMaintenanceDto) {
    await this.findOne(companyId, id);
    return this.prisma.maintenanceLog.update({ where: { id }, data: dto });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.maintenanceLog.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
