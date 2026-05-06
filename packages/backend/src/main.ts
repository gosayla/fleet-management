import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configuredOrigins = (process.env.APP_URL ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowedOrigins = Array.from(new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...configuredOrigins,
  ]));

  const translateValidationMessage = (message: string) => {
    const rules: Array<[RegExp, string]> = [
      [/must be an email/i, 'يجب إدخال بريد إلكتروني صحيح'],
      [/must be a string/i, 'يجب أن تكون القيمة نصية'],
      [/should not be empty/i, 'هذا الحقل مطلوب'],
      [/must be longer than or equal to (\d+) characters/i, 'يجب ألا يقل طول النص عن $1 أحرف'],
      [/must be a number/i, 'يجب أن تكون القيمة رقمية'],
      [/must not be less than (\d+)/i, 'يجب أن تكون القيمة أكبر من أو تساوي $1'],
      [/must be a valid enum value/i, 'القيمة غير مدعومة لهذا الحقل'],
      [/property (.+) should not exist/i, 'الحقل $1 غير مسموح'],
    ];

    for (const [pattern, replacement] of rules) {
      if (pattern.test(message)) {
        return message.replace(pattern, replacement);
      }
    }

    return message;
  };

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const details = errors.flatMap((error) =>
          Object.values(error.constraints ?? {}).map(translateValidationMessage),
        );

        return new BadRequestException({
          message: 'بيانات الطلب غير صالحة',
          errors: details.length ? details : ['تحقق من القيم المدخلة وحاول مرة أخرى'],
        });
      },
    }),
  );

  // CORS
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Serve uploaded files
  const uploadsRoot = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadsRoot, { prefix: '/' });

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Fleet Management API')
    .setDescription('API for Fleet Management — Tamm & Naql integrated')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Fleet Management API running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
