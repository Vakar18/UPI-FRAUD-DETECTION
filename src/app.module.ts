import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import {
  appConfig,
  mongoConfig,
  redisConfig,
  mlConfig,
  fraudConfig,
  simulatorConfig,
  throttleConfig,
} from './config/app.config';

import { TransactionModule } from './modules/transactions/transaction.module';
import { SimulatorModule } from './modules/simulator/simulator.module';
import { HealthModule } from './modules/health/health.module';

// ─────────────────────────────────────────────────────────────────────────────
// app.module.ts
//
// Root module.  Responsibilities:
//  • Load and validate environment variables via ConfigModule
//  • Bootstrap MongoDB connection (async, uses ConfigService)
//  • Bootstrap BullMQ queues with Redis connection (async)
//  • Register global rate-limiter (ThrottlerModule)
//  • Import all feature modules
//
// We use forRootAsync everywhere so the connection config is pulled from the
// validated ConfigService rather than raw process.env strings.
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  imports: [
    // ── 1. Config ─────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,           // available everywhere without re-importing
      cache: true,              // cache parsed values for performance
      load: [
        appConfig,
        mongoConfig,
        redisConfig,
        mlConfig,
        fraudConfig,
        simulatorConfig,
        throttleConfig,
      ],
    }),

    // ── 2. MongoDB ────────────────────────────────────────────────────────
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('mongo.uri'),
        dbName: config.getOrThrow<string>('mongo.dbName'),
        // Connection pool settings for production
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }),
    }),

    // ── 3. BullMQ (Redis-backed queues) ───────────────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('redis.host'),
          port: config.getOrThrow<number>('redis.port'),
          password: config.get<string>('redis.password') || undefined,
        },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
    }),

    // ── 4. Rate limiter ───────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ([{
        ttl: config.getOrThrow<number>('throttle.ttl') * 1000,
        limit: config.getOrThrow<number>('throttle.limit'),
      }]),
    }),

    // ── 5. Cron / schedule support ────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── 6. Feature modules ────────────────────────────────────────────────
    TransactionModule,
    SimulatorModule,
    HealthModule,
  ],
})
export class AppModule {}
