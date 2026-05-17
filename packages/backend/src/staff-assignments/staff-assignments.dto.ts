import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
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

  @ApiPropertyOptional({ example: 75, description: 'Fuel level 0-100%' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  fuelLevel?: number;

  @ApiPropertyOptional({ enum: ['GOOD', 'FAIR', 'POOR'] })
  @IsIn(['GOOD', 'FAIR', 'POOR'])
  @IsOptional()
  conditionRating?: string;

  @ApiPropertyOptional({ type: [String], description: 'Array of uploaded photo URLs' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  conditionPhotos?: string[];

  @ApiPropertyOptional({ description: 'URL of saved signature image' })
  @IsString()
  @IsOptional()
  signatureUrl?: string;

  @ApiPropertyOptional({ description: 'URL of manager signature image' })
  @IsString()
  @IsOptional()
  managerSignatureUrl?: string;

  @ApiPropertyOptional({ type: [String], description: 'Checked item IDs from handover checklist' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  checklistItems?: string[];

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
