import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import * as compression from 'compression';
import { Queue } from 'bullmq';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TRANSACTION_QUEUE } from './modules/queue/queue.constants';

// ─────────────────────────────────────────────────────────────────────────────
// main.ts
//
// Bootstrap sequence:
//  1. Create NestJS application
//  2. Apply security middleware (helmet, CORS)
//  3. Enable response compression
//  4. Apply global validation pipe (class-validator)
//  5. Apply global exception filter (normalised error shape)
//  6. Mount Swagger UI at /docs
//  7. Start listening
//
// Interview talking point:
//  "I set whitelist: true on the ValidationPipe so any property not in the
//   DTO is automatically stripped before it hits the service. Combined with
//   forbidNonWhitelisted it prevents any unexpected payload from leaking
//   into the DB – important in a financial system."
// ─────────────────────────────────────────────────────────────────────────────

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const port      = config.get<number>('app.port')      || 3000;
  const apiPrefix = config.get<string>('app.apiPrefix') || 'api/v1';
  const isDev     = config.get<string>('app.nodeEnv') !== 'production';
  const transactionQueue = app.get<Queue>(getQueueToken(TRANSACTION_QUEUE));

  // ── Security ──────────────────────────────────────────────────────────────
  app.use(helmet());
  app.enableCors({
    origin: isDev ? '*' : process.env.ALLOWED_ORIGINS?.split(','),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Compression ───────────────────────────────────────────────────────────
  app.use(compression());

  // ── Global prefix (e.g. /api/v1/transactions) ─────────────────────────────
  app.setGlobalPrefix(apiPrefix);

  // ── Validation pipe ───────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // strip unknown properties
      forbidNonWhitelisted: true,   // throw on unknown properties
      transform: true,              // auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Exception filter ──────────────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Swagger ───────────────────────────────────────────────────────────────
  if (config.get<boolean>('app.swaggerEnabled') !== false) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('UPI Fraud Detection API')
      .setDescription(
        'Real-time AI-powered fraud detection engine for UPI transactions.\n\n' +
        '## Architecture\n' +
        '- **Ingestion**: POST /transactions → persisted immediately (async scoring)\n' +
        '- **Queue**: BullMQ + Redis → ML microservice called in background\n' +
        '- **Queue Dashboard**: Bull Board → inspect waiting, active, completed and failed jobs\n' +
        '- **Dashboard**: GET /transactions/stats → pre-aggregated MongoDB analytics\n\n' +
        '## Risk Levels\n' +
        '| Level | Score | Action |\n' +
        '|-------|-------|--------|\n' +
        '| LOW | 0–39 | No action |\n' +
        '| MEDIUM | 40–69 | Monitor |\n' +
        '| HIGH | 70–89 | Alert sent |\n' +
        '| CRITICAL | 90–100 | Immediate review |',
      )
      .setVersion('1.0')
      .addTag('Transactions', 'UPI transaction ingestion, querying and analytics')
      .addTag('Health', 'Service health and simulator status')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        defaultModelsExpandDepth: 2,
        operationsSorter: 'alpha',
      },
    });

    logger.log(`Swagger UI → http://localhost:${port}/docs`);
  }

  // ── Bull Board ────────────────────────────────────────────────────────────
  const serverAdapter = new ExpressAdapter();
  const bullBoardPath = `/${apiPrefix}/queues`;
  serverAdapter.setBasePath(bullBoardPath);

  createBullBoard({
    queues: [
      new BullMQAdapter(transactionQueue, {
        description: 'Async transaction scoring jobs',
      }),
    ],
    serverAdapter,
  });
  app.use(bullBoardPath, serverAdapter.getRouter());
  logger.log(`Bull Board → http://localhost:${port}${bullBoardPath}`);

  // ── Start ─────────────────────────────────────────────────────────────────
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`Environment: ${config.get<string>('app.nodeEnv')}`);
}

bootstrap();
