import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

const uploadDir = join(process.cwd(), 'uploads', 'documents');
mkdirSync(uploadDir, { recursive: true });

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${randomUUID()}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (/\.(pdf|jpg|jpeg|png|webp)$/i.test(extname(file.originalname))) {
          cb(null, true);
        } else {
          cb(new Error('Only PDF and image files are allowed'), false);
        }
      },
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
