import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { MaintenanceType, MaintenanceStatus } from '@fleet/shared';
import { Type } from 'class-transformer';

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

  findAll(companyId: string) {
    return this.prisma.maintenanceLog.findMany({
      where: { companyId },
      include: { vehicle: true },
      orderBy: { scheduledDate: 'asc' },
    });
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
