import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const SUPPORTED_LANGUAGES = ['ar', 'en', 'hi', 'bn', 'ur'] as const;

export class LoginDto {
  @ApiProperty({ example: '+966501234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

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

  @ApiProperty({ example: 'ar', required: false, enum: SUPPORTED_LANGUAGES })
  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_LANGUAGES)
  language?: (typeof SUPPORTED_LANGUAGES)[number];
}

export class UpdateFcmTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}

export class UpdateLanguageDto {
  @ApiProperty({ example: 'en', enum: SUPPORTED_LANGUAGES })
  @IsString()
  @IsIn(SUPPORTED_LANGUAGES)
  language: (typeof SUPPORTED_LANGUAGES)[number];
}

export class ResetPasswordDto {
  @ApiProperty({ example: '+966501234567 or admin@fleet.com' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  crNumber: string;

  @ApiProperty({ example: 'NewStrongPassword123' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
