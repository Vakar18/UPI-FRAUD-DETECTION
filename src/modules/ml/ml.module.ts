import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MlService } from './ml.service';

// ─────────────────────────────────────────────────────────────────────────────
// ml.module.ts
//
// Provides MlService to any module that imports MlModule.
// HttpModule is registered here with ML-specific timeout + baseURL
// so the service doesn't need to build URLs manually.
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseURL: config.get<string>('ml.serviceUrl'),
        timeout: config.get<number>('ml.timeout') ?? 5000,
        headers: { 'Content-Type': 'application/json' },
      }),
    }),
  ],
  providers: [MlService],
  exports:   [MlService],
})
export class MlModule {}