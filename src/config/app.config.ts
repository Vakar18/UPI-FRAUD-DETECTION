import { registerAs } from '@nestjs/config';

// ─────────────────────────────────────────────────────────────────────────────
// app.config.ts
//
// Centralised configuration factory.  Every env-var the app needs is declared
// here so there is a single source of truth.  NestJS's ConfigService injects
// this anywhere in the DI tree via the 'app', 'mongo', 'redis', etc. tokens.
// ─────────────────────────────────────────────────────────────────────────────

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseNumber(process.env.PORT, 3000),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false',
  corsOrigin: process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:3000',
}));

export const mongoConfig = registerAs('mongo', () => ({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/upi_fraud_detection',
  dbName: process.env.MONGODB_DB_NAME || 'upi_fraud_detection',
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseNumber(process.env.REDIS_PORT, 6379),
  password: process.env.REDIS_PASSWORD || undefined,
}));

export const mlConfig = registerAs('ml', () => ({
  serviceUrl: process.env.ML_SERVICE_URL || 'http://localhost:5000',
  timeout: parseNumber(process.env.ML_SERVICE_TIMEOUT, 5000),
}));

export const fraudConfig = registerAs('fraud', () => ({
  riskThreshold: parseNumber(process.env.FRAUD_RISK_THRESHOLD, 70),
  mediumThreshold: parseNumber(process.env.MEDIUM_RISK_THRESHOLD, 40),
}));

export const simulatorConfig = registerAs('simulator', () => ({
  enabled: process.env.SIMULATOR_ENABLED !== 'false',
  intervalMs: parseNumber(process.env.SIMULATOR_INTERVAL_MS, 3000),
  batchSize: parseNumber(process.env.SIMULATOR_BATCH_SIZE, 1),
}));

export const throttleConfig = registerAs('throttle', () => ({
  ttl: parseNumber(process.env.THROTTLE_TTL, 60),
  limit: parseNumber(process.env.THROTTLE_LIMIT, 100),
}));
