import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { RentalStatus } from '@prisma/client';

export class CreateRentalDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty({ example: 'Mohammed Al-Zahrani' })
  @IsString()
  @IsNotEmpty()
  clientName: string;

  @ApiPropertyOptional({ example: '+966501234567' })
  @IsString()
  @IsOptional()
  clientPhone?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsString()
  @IsOptional()
  clientNationalId?: string;

  @ApiPropertyOptional({ example: 'RENT-2026-001' })
  @IsString()
  @IsOptional()
  contractNumber?: string;

  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  rentalStart: string;

  @ApiProperty({ example: '2026-05-15' })
  @IsDateString()
  rentalEnd: string;

  @ApiPropertyOptional({ example: 45000, description: 'Odometer reading at handover (km)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  odometerOut?: number;

  @ApiPropertyOptional({ example: 75, description: 'Fuel level 0-100%' })
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

  @ApiPropertyOptional({ description: 'Client signature URL' })
  @IsString()
  @IsOptional()
  signatureUrl?: string;

  @ApiPropertyOptional({ description: 'Manager signature URL' })
  @IsString()
  @IsOptional()
  managerSignatureUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  checklistItems?: string[];

  @ApiPropertyOptional({ example: 350, description: 'Daily rate in SAR' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  dailyRateSar?: number;

  @ApiPropertyOptional({ example: 'https://files.example.com/contract.pdf' })
  @IsString()
  @IsOptional()
  contractFileUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateRentalDto extends PartialType(CreateRentalDto) {
  @ApiPropertyOptional({ enum: RentalStatus })
  @IsEnum(RentalStatus)
  @IsOptional()
  status?: RentalStatus;

  @ApiPropertyOptional({ example: 45850, description: 'Odometer reading at return (km)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  odometerIn?: number;
}
