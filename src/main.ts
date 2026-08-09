import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from '@app/app.module';
import { requestContextMiddleware } from '@common/tenant/request-context';
import type { AppConfig, SwaggerConfig } from '@config/configuration';
import { initSentry } from './observability/sentry';

async function bootstrap(): Promise<void> {
  // Initialize error reporting before anything else (no-op without SENTRY_DSN).
  initSentry();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Buffer early logs until the pino logger is wired in below.
    bufferLogs: true,
  });

  // Security headers. CSP is disabled because this process also serves Swagger
  // UI (inline scripts); the API itself returns JSON.
  app.use(helmet({ contentSecurityPolicy: false }));

  // Use nestjs-pino as the application logger.
  app.useLogger(app.get(Logger));

  // Open the per-request AsyncLocalStorage context (tenant/principal/requestId)
  // for every request, before guards run.
  app.use(requestContextMiddleware);

  const configService = app.get(ConfigService);
  const appConfig = configService.getOrThrow<AppConfig>('app');
  const swaggerConfig = configService.getOrThrow<SwaggerConfig>('swagger');

  // Global API prefix (health endpoints stay unprefixed for orchestrators).
  app.setGlobalPrefix(appConfig.apiPrefix, {
    exclude: ['health', 'health/live'],
  });

  // URI-based API versioning: /<prefix>/v<version>/...
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: appConfig.apiDefaultVersion,
    prefix: 'v',
  });

  // Global input validation. DTOs are the single source of truth for shape.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS (origins configured per environment).
  app.enableCors({
    origin: appConfig.corsOrigins,
    credentials: true,
  });

  // Close DB pool and other resources cleanly on SIGTERM/SIGINT.
  app.enableShutdownHooks();

  if (swaggerConfig.enabled) {
    const documentConfig = new DocumentBuilder()
      .setTitle('Agendox API')
      .setDescription('Multi-tenant booking & scheduling SaaS — backend API')
      .setVersion(appConfig.apiDefaultVersion)
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, documentConfig);
    SwaggerModule.setup(swaggerConfig.path, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(appConfig.port);

  const logger = app.get(Logger);
  const url = await app.getUrl();
  logger.log(`Agendox API running on ${url} (env: ${appConfig.nodeEnv})`);
  if (swaggerConfig.enabled) {
    logger.log(`Swagger UI available at ${url}/${swaggerConfig.path}`);
  }
}

void bootstrap();
