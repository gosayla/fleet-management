import {
  Controller,
  Post,
  Body,
  Patch,
  UseGuards,
  Get,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, ResetPasswordDto, UpdateFcmTokenDto } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import { AuthTokenPayload } from '@fleet/shared';

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthTokenPayload) {
    return user;
  }

  @ApiBearerAuth()
  @Patch('fcm-token')
  updateFcmToken(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    return this.authService.updateFcmToken(user.sub, dto.fcmToken);
  }
}
