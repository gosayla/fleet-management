import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateContractDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  driverId: string;

  @ApiProperty({ example: 'Ahmed Al-Ghamdi' })
  @IsString()
  @IsNotEmpty()
  clientName: string;

  @ApiPropertyOptional({ example: '+966501234567' })
  @IsString()
  @IsOptional()
  clientPhone?: string;

  @ApiPropertyOptional({ example: 'CTR-2026-001' })
  @IsString()
  @IsOptional()
  contractNumber?: string;

  @ApiProperty({ example: 'Riyadh' })
  @IsString()
  @IsNotEmpty()
  origin: string;

  @ApiProperty({ example: 'Jeddah' })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  contractStart: string;

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  contractEnd: string;

  @ApiProperty({ example: '07:30', description: 'Daily departure time HH:MM' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'departureTime must be HH:MM' })
  departureTime: string;

  @ApiPropertyOptional({ example: '17:00', description: 'Return trip time HH:MM (omit if one-way)' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'returnTime must be HH:MM' })
  returnTime?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isTwoWay?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  excludeFridays?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  excludeSaturdays?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateContractDto extends PartialType(CreateContractDto) {}

export class AddVacationDto {
  @ApiProperty({ example: '2026-06-15', description: 'Date to exclude (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'Eid holiday' })
  @IsString()
  @IsOptional()
  reason?: string;
}
