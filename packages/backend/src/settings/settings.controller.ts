import { Controller, Get, Patch, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload } from '@fleet/shared';
import { SettingsService } from './settings.service';
import { UpdateCompanyDto, UpdateProfileDto } from './settings.dto';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('company')
  getCompany(@CurrentUser() user: AuthTokenPayload) {
    return this.settingsService.getCompany(user.companyId);
  }

  @Patch('company')
  updateCompany(@CurrentUser() user: AuthTokenPayload, @Body() dto: UpdateCompanyDto) {
    if (user.role === 'DISPATCHER' || user.role === 'DRIVER' || user.role === 'VIEWER') {
      throw new ForbiddenException('ليس لديك صلاحية تعديل بيانات الشركة');
    }
    return this.settingsService.updateCompany(user.companyId, dto);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: AuthTokenPayload) {
    return this.settingsService.getProfile(user.sub);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthTokenPayload, @Body() dto: UpdateProfileDto) {
    return this.settingsService.updateProfile(user.sub, dto);
  }
}
