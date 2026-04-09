import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// ─────────────────────────────────────────────────────────────────────────────
// http-exception.filter.ts
//
// Normalises ALL error responses to a consistent shape:
//  { success: false, statusCode, message, path, timestamp }
//
// Interview talking point:
//  "I use a global exception filter so every error across every controller
//   returns the same JSON structure. Frontend never has to handle different
//   error shapes."
// ─────────────────────────────────────────────────────────────────────────────

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as any)?.message || exception.message
        : 'Internal server error';

    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url} → ${status}`, (exception as Error).stack);
    }

    res.status(status).json({
      success: false,
      statusCode: status,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}