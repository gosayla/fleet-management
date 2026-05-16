import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateStaffAssignmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty({ example: 'Ahmed Al-Qahtani' })
  @IsString()
  @IsNotEmpty()
  assigneeName: string;

  @ApiPropertyOptional({ example: 'Senior Engineer' })
  @IsString()
  @IsOptional()
  assigneeTitle?: string;

  @ApiPropertyOptional({ example: '+966501234567' })
  @IsString()
  @IsOptional()
  assigneePhone?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsString()
  @IsOptional()
  assigneeNationalId?: string;

  @ApiPropertyOptional({ example: '2026-05-16' })
  @IsDateString()
  @IsOptional()
  assignedAt?: string;

  @ApiPropertyOptional({ example: 45000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  odometerOut?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReturnStaffVehicleDto {
  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsDateString()
  @IsOptional()
  returnedAt?: string;

  @ApiPropertyOptional({ example: 46500 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  odometerIn?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateStaffAssignmentDto extends PartialType(CreateStaffAssignmentDto) {}
