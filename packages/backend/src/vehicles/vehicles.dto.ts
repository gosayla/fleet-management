import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { VehicleType, VehicleStatus } from '@fleet/shared';

export class CreateVehicleDto {
  @ApiProperty({ example: 'ABC 1234' })
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @ApiProperty({ example: 'Toyota' })
  @IsString()
  @IsNotEmpty()
  make: string;

  @ApiProperty({ example: 'Hilux' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ example: 2022 })
  @IsInt()
  @Min(1990)
  year: number;

  @ApiProperty({ example: 'White' })
  @IsString()
  @IsNotEmpty()
  color: string;

  @ApiProperty({ enum: VehicleType })
  @IsEnum(VehicleType)
  type: VehicleType;

  @ApiProperty({ example: 'ABC123VIN456789' })
  @IsString()
  @IsNotEmpty()
  vin: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  odometer: number;

  @ApiProperty({ example: 70 })
  @IsNumber()
  @Min(1)
  fuelCapacity: number;

  @ApiPropertyOptional({ example: 'Private Transport' })
  @IsString()
  @IsOptional()
  plateType?: string;

  @ApiPropertyOptional({ example: '12345678' })
  @IsString()
  @IsOptional()
  sequenceNumber?: string;

  @ApiPropertyOptional({ example: '4 Wheels' })
  @IsString()
  @IsOptional()
  bodyType?: string;

  @ApiPropertyOptional({ example: '1447-06-07' })
  @IsString()
  @IsOptional()
  ownershipDate?: string;

  @ApiPropertyOptional({ example: '1447-04-01' })
  @IsString()
  @IsOptional()
  licenseIssuanceDate?: string;

  @ApiPropertyOptional({ example: '2027-08-31' })
  @IsString()
  @IsOptional()
  inspectionExpiryDate?: string;

  @ApiPropertyOptional({ example: 'Unrestricted' })
  @IsString()
  @IsOptional()
  restrictionStatus?: string;

  @ApiPropertyOptional({ example: '2027-12-31' })
  @IsString()
  @IsOptional()
  licenseExpiryDate?: string;

  @ApiPropertyOptional({ example: '2027-11-30' })
  @IsString()
  @IsOptional()
  insuranceExpiryDate?: string;

  @ApiPropertyOptional({ example: '35-00044426' })
  @IsString()
  @IsOptional()
  operationCardNumber?: string;

  @ApiPropertyOptional({ example: '2025-05-01' })
  @IsString()
  @IsOptional()
  operationCardIssueDate?: string;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsString()
  @IsOptional()
  operationCardExpiryDate?: string;

  @ApiPropertyOptional({ example: '2026-05-03' })
  @IsString()
  @IsOptional()
  operationCardRenewDate?: string;

  @ApiPropertyOptional({ example: '/documents/op-card.pdf' })
  @IsString()
  @IsOptional()
  operationCardFileUrl?: string;
}

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {
  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;

  @ApiPropertyOptional({ example: '2027-12-31' })
  @IsString()
  @IsOptional()
  licenseExpiryDate?: string;

  @ApiPropertyOptional({ example: '2027-11-30' })
  @IsString()
  @IsOptional()
  insuranceExpiryDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assignedDriverId?: string;
}

export class VehiclesQueryDto {
  @ApiPropertyOptional({ description: 'Search by plate, sequence, make, or model' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: ['insuranceExpiryDate', 'licenseExpiryDate', 'operationCardExpiryDate', 'inspectionExpiryDate', 'createdAt', 'plateNumber'] })
  @IsOptional()
  @IsEnum(['insuranceExpiryDate', 'licenseExpiryDate', 'operationCardExpiryDate', 'inspectionExpiryDate', 'createdAt', 'plateNumber'])
  sortBy?: 'insuranceExpiryDate' | 'licenseExpiryDate' | 'operationCardExpiryDate' | 'inspectionExpiryDate' | 'createdAt' | 'plateNumber';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ enum: ['all', 'has', 'none'], default: 'all' })
  @IsOptional()
  @IsEnum(['all', 'has', 'none'])
  operationCard?: 'all' | 'has' | 'none';

  @ApiPropertyOptional({ enum: ['all', 'has', 'none'], default: 'all', description: 'Filter by GPS tracker: has = pilotImei assigned, none = no GPS device' })
  @IsOptional()
  @IsEnum(['all', 'has', 'none'])
  gpsFilter?: 'all' | 'has' | 'none';
}
