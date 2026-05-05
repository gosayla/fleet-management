import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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

  findAll(companyId: string) {
    return this.prisma.fuelLog.findMany({
      where: { companyId },
      include: { vehicle: true, driver: true },
      orderBy: { filledAt: 'desc' },
    });
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
