import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DriverStatus } from '@fleet/shared';
import { IsEnum } from 'class-validator';
import { BloodType } from '@prisma/client';

export class CreateDriverDto {
  @ApiProperty({ example: 'Mohammed Al-Qahtani' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '+966501234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'driver@fleet.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '1098765432' })
  @IsString()
  @IsNotEmpty()
  nationalId: string;

  @ApiProperty({ example: 'SA-DL-123456' })
  @IsString()
  @IsNotEmpty()
  licenseNumber: string;

  @ApiProperty({ example: '2027-06-15' })
  @IsDateString()
  licenseExpiry: string;

  @ApiPropertyOptional({ enum: BloodType, example: 'A_POS' })
  @IsEnum(BloodType)
  @IsOptional()
  bloodType?: BloodType;
}

export class UpdateDriverDto extends PartialType(CreateDriverDto) {
  @ApiPropertyOptional({ enum: DriverStatus })
  @IsEnum(DriverStatus)
  @IsOptional()
  status?: DriverStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assignedVehicleId?: string;
}
