import { IsDateString, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePermitDto {
  @ApiProperty({ example: 'ABC 1234' })
  @IsString()
  @IsNotEmpty()
  vehiclePlate: string;

  @ApiProperty({ example: '1098765432' })
  @IsString()
  @IsNotEmpty()
  driverNationalId: string;

  @ApiProperty({ example: 'Riyadh' })
  @IsString()
  @IsNotEmpty()
  origin: string;

  @ApiProperty({ example: 'Jeddah' })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty({ example: 'General Goods' })
  @IsString()
  @IsNotEmpty()
  cargoType: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  cargoWeight: number;

  @ApiProperty({ example: '2026-05-01' })
  @Type(() => Date)
  validFrom: Date;

  @ApiProperty({ example: '2026-08-01' })
  @Type(() => Date)
  validTo: Date;
}
