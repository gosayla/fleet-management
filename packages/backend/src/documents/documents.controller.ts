import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload } from '@fleet/shared';
import { CreateDocumentDto, DocumentsQueryDto, UpdateDocumentDto } from './documents.dto';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /** Upload a file and receive a fileUrl to use when creating/updating a document. */
  @Post('files')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return { fileUrl: `/documents/${file.filename}` };
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
