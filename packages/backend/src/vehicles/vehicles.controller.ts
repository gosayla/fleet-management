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
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto, VehiclesQueryDto } from './vehicles.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload, UserRole } from '@fleet/shared';
import { Roles } from '../auth/roles.decorator';

@ApiTags('vehicles')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER, UserRole.VIEWER, UserRole.MAINTENANCE_TECH)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER, UserRole.VIEWER, UserRole.MAINTENANCE_TECH, UserRole.DRIVER)
  findAll(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: VehiclesQueryDto,
  ) {
    return this.vehiclesService.findAll(user.companyId, query, user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.vehiclesService.findOne(user.companyId, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(user.companyId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.vehiclesService.remove(user.companyId, id);
  }

  /** POST /vehicles/import/preview — parse XLSX and return rows without saving */
  @Post('import/preview')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  previewImport(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('لم يتم إرفاق ملف');
    return { rows: this.vehiclesService.parseImportFile(file.buffer) };
  }

  /** POST /vehicles/import — parse XLSX and upsert vehicles into DB */
  @Post('import')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  importVehicles(
    @CurrentUser() user: AuthTokenPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('لم يتم إرفاق ملف');
    const rows = this.vehiclesService.parseImportFile(file.buffer);
    return this.vehiclesService.importVehicles(user.companyId, rows);
  }

  // ─── Vehicle Photos ────────────────────────────────────────────────────────

  @Get(':id/photos')
  getPhotos(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.vehiclesService.getPhotos(user.companyId, id);
  }

  @Post(':id/photos')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  addPhoto(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.vehiclesService.addPhoto(user.companyId, id, file.filename, caption);
  }

  @Patch(':id/photos/:photoId/profile')
  setProfilePhoto(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    return this.vehiclesService.setProfilePhoto(user.companyId, id, photoId);
  }

  @Delete(':id/photos/:photoId')
  deletePhoto(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    return this.vehiclesService.deletePhoto(user.companyId, id, photoId);
  }

  // ─── Driver assignment ────────────────────────────────────────────────────

  @Post(':id/drivers/:driverId')
  assignDriver(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Param('driverId') driverId: string,
  ) {
    return this.vehiclesService.assignDriver(user.companyId, id, driverId);
  }

  @Delete(':id/drivers/:driverId')
  removeDriver(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Param('driverId') driverId: string,
  ) {
    return this.vehiclesService.removeDriver(user.companyId, id, driverId);
  }
}
