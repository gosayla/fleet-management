import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@fleet.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongPassword123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'admin@fleet.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongPassword123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Ahmed Al-Rashidi' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '+966501234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Al-Rashidi Logistics Co.' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  crNumber: string;
}

export class UpdateFcmTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}
