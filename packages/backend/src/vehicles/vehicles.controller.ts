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
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto, VehiclesQueryDto } from './vehicles.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload } from '@fleet/shared';

@ApiTags('vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: VehiclesQueryDto,
  ) {
    return this.vehiclesService.findAll(user.companyId, query);
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
  @UseInterceptors(FileInterceptor('file'))
  previewImport(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('لم يتم إرفاق ملف');
    return { rows: this.vehiclesService.parseImportFile(file.buffer) };
  }

  /** POST /vehicles/import — parse XLSX and upsert vehicles into DB */
  @Post('import')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  importVehicles(
    @CurrentUser() user: AuthTokenPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('لم يتم إرفاق ملف');
    const rows = this.vehiclesService.parseImportFile(file.buffer);
    return this.vehiclesService.importVehicles(user.companyId, rows);
  }
}
