import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync } from 'fs';
import { join } from 'path';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload, UserRole } from '@fleet/shared';
import { CreateDocumentDto, DocumentsQueryDto, UpdateDocumentDto } from './documents.dto';
import { DocumentsService } from './documents.service';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';

@ApiTags('documents')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER, UserRole.VIEWER)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Public()
  @Get('files/:filename')
  serveFile(
    @Param('filename') filename: string,
    @Res() response: Response,
  ) {
    const uploadsRoot = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');
    const filePath = join(uploadsRoot, 'documents', filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }
    return response.sendFile(filePath);
  }

  /** Upload a file and receive a fileUrl to use when creating/updating a document. */
  @Post('files')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return { fileUrl: `/documents/files/${file.filename}` };
  }

  @Post()
  create(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documentsService.create(user.companyId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: DocumentsQueryDto,
  ) {
    return this.documentsService.findAll(user.companyId, query);
  }

  @Get('expiring')
  getExpiringSummary(@CurrentUser() user: AuthTokenPayload) {
    return this.documentsService.getExpiringSummary(user.companyId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
  ) {
    return this.documentsService.findOne(user.companyId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
  ) {
    return this.documentsService.remove(user.companyId, id);
  }
}
