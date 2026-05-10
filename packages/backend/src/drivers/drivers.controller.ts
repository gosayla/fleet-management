import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto } from './drivers.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload, UserRole } from '@fleet/shared';
import { Roles } from '../auth/roles.decorator';

@ApiTags('drivers')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER, UserRole.VIEWER)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get('me')
  @Roles(UserRole.DRIVER)
  findMe(@CurrentUser() user: AuthTokenPayload) {
    return this.driversService.findMe(user.companyId, user.sub);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthTokenPayload,
    @Query('search') search?: string,
  ) {
    return this.driversService.findAll(user.companyId, search);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.driversService.findOne(user.companyId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateDriverDto) {
    return this.driversService.create(user.companyId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.driversService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.driversService.remove(user.companyId, id);
  }

  @Post(':id/photo')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadPhoto(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.driversService.uploadPhoto(user.companyId, id, file.filename);
  }
}
