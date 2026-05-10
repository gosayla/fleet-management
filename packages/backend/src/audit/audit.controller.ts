import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditLogsQueryDto } from './audit.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload, UserRole } from '@fleet/shared';
import { Roles } from '../auth/roles.decorator';

@ApiTags('audit')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: AuditLogsQueryDto,
  ) {
    return this.auditService.findAll(user.companyId, query);
  }
}
