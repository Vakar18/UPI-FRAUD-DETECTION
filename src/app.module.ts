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
import { SimulatorModule }   from './modules/simulator/simulator.module';
import { HealthModule }      from './modules/health/health.module';
import { MlModule }          from './modules/ml/ml.module';
import { GatewayModule }     from './modules/gateway/gateway.module';
import { UploadModule }      from './modules/upload/upload.module';

// ─────────────────────────────────────────────────────────────────────────────
// app.module.ts  (Part 3 – final: UploadModule + GatewayModule registered)
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      cache:    true,
      load: [
        appConfig, mongoConfig, redisConfig,
        mlConfig,  fraudConfig, simulatorConfig, throttleConfig,
      ],
    }),

    // ── MongoDB ──────────────────────────────────────────────────────────────
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        uri:                       c.getOrThrow<string>('mongo.uri'),
        dbName:                    c.getOrThrow<string>('mongo.dbName'),
        maxPoolSize:               10,
        serverSelectionTimeoutMS:  5000,
        socketTimeoutMS:           45000,
      }),
    }),

    // ── BullMQ ────────────────────────────────────────────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        connection: {
          host:     c.getOrThrow<string>('redis.host'),
          port:     c.getOrThrow<number>('redis.port'),
          password: c.get<string>('redis.password') || undefined,
        },
        defaultJobOptions: {
          attempts:         3,
          backoff:          { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 100 },
          removeOnFail:     { count: 500 },
        },
      }),
    }),

    // ── Rate limiter ──────────────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ([{
        ttl:   c.getOrThrow<number>('throttle.ttl') * 1000,
        limit: c.getOrThrow<number>('throttle.limit'),
      }]),
    }),

    // ── Cron scheduler ────────────────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Feature modules ───────────────────────────────────────────────────────
    MlModule,
    GatewayModule,
    TransactionModule,
    UploadModule,
    SimulatorModule,
    HealthModule,
  ],
})
export class AppModule {}
