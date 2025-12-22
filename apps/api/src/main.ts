import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { OciLoggerService } from './common/loggers/oci-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const ociLoggerService = app.get(OciLoggerService);
  app.useLogger(ociLoggerService);

  const webappUrl = process.env.WEBAPP_URL || 'http://localhost:4200';
  const additionalOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const baseOrigins: Array<string> = Array.from(
    new Set([
      webappUrl,
      'http://localhost:4200',
      'http://localhost:3000',
      ...additionalOrigins,
    ])
  );
  const corsOrigins: Array<string | RegExp> = [...baseOrigins];

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
  });

  // Enable trust proxy for Cloudflare and Nginx Proxy Manager
  // This allows rate limiting to work correctly by detecting real client IPs
  // from forwarded headers (CF-Connecting-IP, X-Forwarded-For, X-Real-IP)
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  const port = process.env.PORT || 3001;

  process.on('SIGTERM', async () => {
    Logger.log('📴 SIGTERM received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    Logger.log('📴 SIGINT received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/`
  );
}

bootstrap();
