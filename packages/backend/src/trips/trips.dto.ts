import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TripStatus } from '@fleet/shared';
import { TripType } from '@prisma/client';

export class CreateTripDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  driverId: string;

  @ApiPropertyOptional({ example: 'Airport Transfer #12' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: TripType, default: TripType.ONE_TIME })
  @IsEnum(TripType)
  @IsOptional()
  tripType?: TripType;

  @ApiProperty({ example: 'Riyadh' })
  @IsString()
  @IsNotEmpty()
  origin: string;

  @ApiProperty({ example: 'Jeddah' })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiPropertyOptional({ example: 24.7136 })
  @IsNumber()
  @IsOptional()
  originLat?: number;

  @ApiPropertyOptional({ example: 46.6753 })
  @IsNumber()
  @IsOptional()
  originLng?: number;

  @ApiPropertyOptional({ example: 21.3891 })
  @IsNumber()
  @IsOptional()
  destinationLat?: number;

  @ApiPropertyOptional({ example: 39.8579 })
  @IsNumber()
  @IsOptional()
  destinationLng?: number;

  @ApiProperty({ example: '2026-05-10T08:00:00Z' })
  @Type(() => Date)
  @IsDate()
  scheduledStart: Date;

  @ApiProperty({ example: '2026-05-10T20:00:00Z' })
  @Type(() => Date)
  @IsDate()
  scheduledEnd: Date;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Naql permit ID if freight trip' })
  @IsString()
  @IsOptional()
  naqlPermitId?: string;

  @ApiPropertyOptional({ description: 'Client or passenger name' })
  @IsString()
  @IsOptional()
  clientName?: string;

  @ApiPropertyOptional({ description: 'Contract reference number' })
  @IsString()
  @IsOptional()
  contractNumber?: string;

  @ApiPropertyOptional({ description: 'Billing period start date' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  contractStart?: Date;

  @ApiPropertyOptional({ description: 'Billing period end date' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  contractEnd?: Date;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  fuelLevel?: number;

  @ApiPropertyOptional({ enum: ['GOOD', 'FAIR', 'POOR'] })
  @IsString()
  @IsOptional()
  conditionRating?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  conditionPhotos?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  driverSignatureUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  managerSignatureUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  checklistItems?: string[];
}

export class UpdateTripDto extends PartialType(CreateTripDto) {
  @ApiPropertyOptional({ enum: TripStatus })
  @IsEnum(TripStatus)
  @IsOptional()
  status?: TripStatus;
}

export class TripLocationDto {
  @ApiProperty({ example: 24.7136 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 46.6753 })
  @IsNumber()
  lng: number;

  @ApiPropertyOptional({ example: 60.5, description: 'Speed in km/h' })
  @IsNumber()
  @IsOptional()
  speed?: number;

  @ApiPropertyOptional({ example: 180, description: 'Heading in degrees' })
  @IsNumber()
  @IsOptional()
  heading?: number;

  @ApiProperty({ example: '2026-05-07T10:30:00Z', description: 'Time the GPS fix was recorded on the device' })
  @Type(() => Date)
  @IsDate()
  recordedAt: Date;
}
