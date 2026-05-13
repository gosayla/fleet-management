import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DocumentType } from '@fleet/shared';

export class CreateDocumentDto {
  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  type: DocumentType;

  @ApiProperty({ example: 'https://files.example.com/doc.pdf' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional({ type: [String], description: 'Vehicle IDs to link this document to' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vehicleIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Driver IDs to link this document to' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  driverIds?: string[];

  @ApiPropertyOptional({ example: 'Traffic Department' })
  @IsOptional()
  @IsString()
  issuingAuthority?: string;

  @ApiPropertyOptional({ example: 'REF-2026-001' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({ example: 'Shared insurance policy for multiple vehicles' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}

export class DocumentsQueryDto {
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

  @ApiPropertyOptional({ description: 'Search by reference number, authority, vehicle plate, or driver name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @ApiPropertyOptional({ enum: ['all', 'expired', 'expiring', 'valid'], default: 'all' })
  @IsOptional()
  @IsEnum(['all', 'expired', 'expiring', 'valid'])
  status?: 'all' | 'expired' | 'expiring' | 'valid';

  @ApiPropertyOptional({ description: 'Filter by vehicle ID' })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Filter by driver ID' })
  @IsOptional()
  @IsString()
  driverId?: string;

  @ApiPropertyOptional({ enum: ['vehicle', 'driver'], description: 'Filter documents by linked target type' })
  @IsOptional()
  @IsEnum(['vehicle', 'driver'])
  target?: 'vehicle' | 'driver';
}
