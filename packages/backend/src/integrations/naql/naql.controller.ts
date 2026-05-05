import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { NaqlClient } from './naql.client';
import { CreatePermitDto } from './naql.dto';

@ApiTags('naql')
@ApiBearerAuth()
@Controller('naql')
@UseGuards(JwtAuthGuard)
export class NaqlController {
  constructor(private readonly naqlClient: NaqlClient) {}

  @Get('permits')
  getPermits() {
    return this.naqlClient.getPermits();
  }

  @Get('permits/:permitId')
  getPermit(@Param('permitId') permitId: string) {
    return this.naqlClient.getPermit(permitId);
  }

  @Post('permits')
  createPermit(@Body() dto: CreatePermitDto) {
    return this.naqlClient.createPermit(dto);
  }

  @Delete('permits/:permitId')
  cancelPermit(@Param('permitId') permitId: string) {
    return this.naqlClient.cancelPermit(permitId);
  }

  @Get('permits/:permitId/status')
  getPermitStatus(@Param('permitId') permitId: string) {
    return this.naqlClient.getPermitStatus(permitId);
  }
}
