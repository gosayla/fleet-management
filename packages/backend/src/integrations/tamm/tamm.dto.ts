import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class IssueDelegationDto {
  @ApiProperty({ example: 'Mohammed Al-Qahtani' })
  @IsString()
  @IsNotEmpty()
  delegateName: string;

  @ApiProperty({ example: '1098765432' })
  @IsString()
  @IsNotEmpty()
  delegateNationalId: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isInternational: boolean;

  @ApiProperty({ example: '2026-01-01' })
  @Type(() => Date)
  validFrom: Date;

  @ApiProperty({ example: '2026-12-31' })
  @Type(() => Date)
  validTo: Date;
}

// ─── Actual Driver DTOs ────────────────────────────────────────────────────────

class PlateDtoInput {
  @ApiProperty({ example: 'د' }) @IsString() text1: string;
  @ApiProperty({ example: 'ع' }) @IsString() text2: string;
  @ApiProperty({ example: 'س' }) @IsString() text3: string;
  @ApiProperty({ example: 1946 }) @IsInt() number: number;
  @ApiProperty({ example: { code: 1 } }) type: { code: number };
}

export class ActualDriverVerifyVehicleBodyDto {
  @ApiProperty({ type: PlateDtoInput })
  @ValidateNested()
  @Type(() => PlateDtoInput)
  plateDto: PlateDtoInput;

  @ApiPropertyOptional({ example: '5b4c72f8-b422-4d09-a4ba-a418ef80c352' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ example: '4c584ed4-7cca-492e-a376-c4afeb95202d' })
  @IsOptional()
  @IsUUID()
  driverId?: string;
}

export class ActualDriverVerifyAdditionBodyDto {
  @ApiProperty({ example: 2, enum: [2, 3], description: '2=Company, 3=Individual' })
  @IsIn([2, 3])
  type: 2 | 3;

  @ApiProperty({ example: '7001462725' })
  @IsString()
  @IsNotEmpty()
  idNumber: string;

  @ApiPropertyOptional({ example: 1985 })
  @IsOptional()
  @IsInt()
  birthYear?: number;

  @ApiPropertyOptional({ example: 1, enum: [1, 2] })
  @IsOptional()
  @IsIn([1, 2])
  crossValidationBy?: 1 | 2;

  @ApiPropertyOptional({ type: PlateDtoInput })
  @IsOptional()
  @ValidateNested()
  @Type(() => PlateDtoInput)
  crossValidationPlateDto?: PlateDtoInput;

  @ApiPropertyOptional({ example: '2108824836' })
  @IsOptional()
  @IsString()
  residentIqamaId?: string;

  @ApiProperty({ example: '558526036' })
  @IsString()
  @IsNotEmpty()
  mobileNumber: string;

  @ApiPropertyOptional({ example: '4c584ed4-7cca-492e-a376-c4afeb95202d' })
  @IsOptional()
  @IsUUID()
  driverId?: string;
}

export class ActualDriverFinalSubmitBodyDto {
  @ApiProperty({ example: '1234', nullable: true })
  otp: string | null;

  @ApiPropertyOptional({ example: '5b4c72f8-b422-4d09-a4ba-a418ef80c352' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ example: '4c584ed4-7cca-492e-a376-c4afeb95202d' })
  @IsOptional()
  @IsUUID()
  driverId?: string;
}

export class ActualDriverRemoveVerifyBodyDto {
  @ApiProperty({ type: PlateDtoInput })
  @ValidateNested()
  @Type(() => PlateDtoInput)
  plateDto: PlateDtoInput;

  @ApiPropertyOptional({ example: '5b4c72f8-b422-4d09-a4ba-a418ef80c352' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}

