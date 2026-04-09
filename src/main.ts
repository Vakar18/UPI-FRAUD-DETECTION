import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as compression from 'compression';
import helmet from 'helmet';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BaseAdapter } from '@bull-board/api/dist/src/queueAdapters/base';
import { ExpressAdapter as BullBoardExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TRANSACTION_QUEUE } from './modules/queue/queue.constants';

// ─────────────────────────────────────────────────────────────────────────────
// main.ts  (Part 2 – BullMQ + BullBoard queue dashboard)
//
// Bootstrap sequence:
//  1. Create NestJS application
//  2. Apply security middleware (helmet, CORS)
//  3. Enable response compression
//  4. Mount BullBoard at /queues  ← new in Part 2
//  5. Apply global validation pipe (whitelist + transform)
//  6. Apply global exception filter (normalised error shape)
//  7. Mount Swagger at /docs
//  8. Start listening
//
// BullBoard lives at /queues (outside the /api/v1 prefix) – it is a dev
// tool, not part of the public API surface.  In production, restrict access
// to it behind an IP allowlist or internal load balancer.
// ─────────────────────────────────────────────────────────────────────────────

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const port      = config.get<number>('app.port')      || 3000;
  const apiPrefix = config.get<string>('app.apiPrefix') || 'api/v1';
  const isDev     = config.get<string>('app.nodeEnv')   !== 'production';

  // ── Security ──────────────────────────────────────────────────────────────
  app.use(
    helmet({
      // BullBoard serves inline scripts so we need to relax CSP for it
      contentSecurityPolicy: isDev ? false : undefined,
    }),
  );
  app.enableCors({
    origin: isDev ? '*' : process.env.ALLOWED_ORIGINS?.split(','),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Compression ───────────────────────────────────────────────────────────
  app.use(compression());

  // ── Static demo page ──────────────────────────────────────────────────────
  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '/demo/',
  });
  logger.log(`Alerts demo → http://localhost:${port}/demo/alerts-demo.html`);

  // ── BullBoard queue dashboard (mounted at /queues) ────────────────────────
  //
  // We build the Queue instance directly here (not via DI) because BullBoard
  // needs it before NestJS finishes bootstrapping its modules.
  // The Queue shares the same Redis connection as the BullMQ module.
  const bullBoardAdapter = new BullBoardExpressAdapter();
  bullBoardAdapter.setBasePath('/queues');

  const redisConfig = {
    host:     config.get<string>('redis.host')     || 'localhost',
    port:     config.get<number>('redis.port')     || 6379,
    password: config.get<string>('redis.password') || undefined,
  };

  const txnQueue = new Queue(TRANSACTION_QUEUE, { connection: redisConfig });
  const txnQueueAdapter = new BullMQAdapter(txnQueue) as unknown as BaseAdapter;

  createBullBoard({
    queues:  [txnQueueAdapter],
    serverAdapter: bullBoardAdapter,
  });

  // Mount BEFORE setGlobalPrefix so it stays at /queues not /api/v1/queues
  app.use('/queues', bullBoardAdapter.getRouter());
  logger.log(`BullBoard → http://localhost:${port}/queues`);

  // ── Global prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix(apiPrefix);

  // ── Validation pipe ───────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,   // strip unknown properties
      forbidNonWhitelisted: true,   // throw 400 on unknown properties
      transform:            true,   // auto-cast query params to correct types
      transformOptions: { enableImplicitConversion: true },
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
        '- **Ingestion**: POST /transactions → persisted immediately, async scoring via BullMQ\n' +
        '- **Queue dashboard**: [/queues](/queues) – BullBoard live job monitor\n' +
        '- **Live demo**: [/demo/alerts-demo.html](/demo/alerts-demo.html) – fraud alert stream for simulator demos\n' +
        '- **ML scoring**: Python microservice (Isolation Forest) with rule-based fallback\n' +
        '- **Analytics**: GET /transactions/stats → pre-aggregated MongoDB pipeline\n\n' +
        '## Risk Levels\n' +
        '| Level | Score | Action |\n' +
        '|-------|-------|--------|\n' +
        '| LOW | 0–39 | No action |\n' +
        '| MEDIUM | 40–69 | Monitor |\n' +
        '| HIGH | 70–89 | Alert sent |\n' +
        '| CRITICAL | 90–100 | Immediate review |',
      )
      .setVersion('2.0')
      .addTag('Transactions', 'UPI transaction ingestion, querying and analytics')
      .addTag('Upload', 'CSV bulk upload for historical transaction data')
      .addTag('Health', 'Service health checks and simulator status')
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

  // ── Start ─────────────────────────────────────────────────────────────────
  await app.listen(port);
  logger.log(`Application → http://localhost:${port}/${apiPrefix}`);
  logger.log(`Environment: ${config.get<string>('app.nodeEnv')}`);
}

bootstrap();
