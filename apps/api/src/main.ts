/**
 * TeslaGuard API Server
 * Serveur API pour la gestion des alertes Tesla via ZMQ
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for local development and production
  const webappUrl = process.env.WEBAPP_URL || 'http://localhost:4200';
  app.enableCors({
    origin: [
      webappUrl,
      'http://localhost:4200',
      'http://localhost:3000',
      /^https?:\/\/.*\.sentryguard\.org$/  // Allow all sentryguard.org subdomains in production
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
  });

  // Enable trust proxy for Cloudflare and Nginx Proxy Manager
  // This allows rate limiting to work correctly by detecting real client IPs
  // from forwarded headers (CF-Connecting-IP, X-Forwarded-For, X-Real-IP)
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/`
  );
}

bootstrap();

