import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { GracefulShutdownService } from './app/shared/graceful-shutdown.service';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import { validateSecrets } from './common/utils/crypto.util';

async function bootstrap() {
  try {
    validateSecrets();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Invalid secrets configuration: ${message}. Shutting down.`);
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  app.useLogger(app.get(PinoLogger));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  // Global security headers via helmet
  app.use(helmet());

  const webappUrl = process.env.WEBAPP_URL || 'http://localhost:4200';
  const additionalOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const developmentOrigins =
    process.env.NODE_ENV === 'production'
      ? []
      : [
        'http://localhost:4200',
        'http://localhost:3000',
        'http://localhost:8081',
        'http://localhost:19006',
      ];
  const baseOrigins: Array<string> = Array.from(
    new Set([webappUrl, ...developmentOrigins, ...additionalOrigins])
  );

  const originRegex = /^https?:\/\/[a-zA-Z0-9.-]+(:\d+)?$/;
  const validatedOrigins = baseOrigins
    .map((origin) => origin.replace(/\/$/, '').toLowerCase())
    .filter((origin) => {
      if (origin === '*') {
        Logger.warn(
          `⚠️ Wildcard '*' detected in CORS origins. This is not recommended when credentials are enabled.`,
          'Bootstrap'
        );
        return false;
      }
      if (!originRegex.test(origin)) {
        Logger.error(
          `❌ Invalid CORS origin format ignored: "${origin}"`,
          '',
          'Bootstrap'
        );
        return false;
      }
      return true;
    });

  if (validatedOrigins.length === 0 && process.env.WEBAPP_URL) {
    Logger.error(
      `❌ No valid CORS origins after validation. Check WEBAPP_URL and CORS_ALLOWED_ORIGINS env vars.`,
      '',
      'Bootstrap'
    );
    process.exit(1);
  }
  const corsOrigins: Array<string | RegExp> = [...validatedOrigins];

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
  });

  app.use((_req: any, res: any, next: () => void) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  app.use(['/auth', '/callback'], (_req: any, res: any, next: () => void) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Enable trust proxy for Cloudflare and Nginx Proxy Manager
  // Restrict trust proxy configuration in production to prevent header spoofing
  if (process.env.NODE_ENV === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', 'loopback, linklocal, uniquelocal');
  } else {
    app.getHttpAdapter().getInstance().set('trust proxy', true);
  }

  const port = process.env.PORT || 3001;

  process.on('SIGTERM', async () => {
    Logger.log('📴 SIGTERM received, shutting down gracefully...');
    await initiateGracefulShutdown(app);
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    Logger.log('📴 SIGINT received, shutting down gracefully...');
    await initiateGracefulShutdown(app);
    await app.close();
    process.exit(0);
  });

  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/`
  );
}

async function initiateGracefulShutdown(app: NestExpressApplication): Promise<void> {
  try {
    await app.get<GracefulShutdownService>(GracefulShutdownService).initiateShutdown();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Logger.error(`❌ Graceful shutdown drain failed, proceeding with shutdown: ${message}`);
  }
}

bootstrap();
