import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import {
  CreateTransactionDto,
  QueryTransactionDto,
} from './dto/transaction.dto';

// ─────────────────────────────────────────────────────────────────────────────
// transaction.controller.ts
//
// REST surface for the transactions module.
//
// Route summary:
//  POST   /transactions              – ingest a new UPI transaction
//  GET    /transactions              – paginated list with filters
//  GET    /transactions/stats        – dashboard aggregate stats
//  GET    /transactions/:txnId       – single transaction detail
//  PATCH  /transactions/:txnId/clear – analyst clears a flagged transaction
// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionController {
  private readonly logger = new Logger(TransactionController.name);

  constructor(private readonly service: TransactionService) {}

  // ── POST /transactions ────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)  // 202: accepted for async processing
  @ApiOperation({
    summary: 'Ingest a new UPI transaction',
    description:
      'Persists the transaction immediately with status=PENDING and enqueues ' +
      'it for async ML risk scoring. Returns the saved document — the ' +
      'riskScore / riskLevel fields will be populated once the queue ' +
      'processor completes (typically <200ms).',
  })
  @ApiResponse({ status: 202, description: 'Transaction accepted and queued for scoring' })
  @ApiResponse({ status: 409, description: 'Duplicate txnId' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async ingest(@Body() dto: CreateTransactionDto) {
    const txn = await this.service.ingest(dto);
    return {
      success: true,
      message: 'Transaction accepted and queued for risk scoring',
      data: txn,
    };
  }

  // ── GET /transactions/stats ───────────────────────────────────────────────
  // NOTE: /stats must come BEFORE /:txnId so NestJS doesn't treat "stats" as a param
  @Get('stats')
  @ApiOperation({
    summary: 'Dashboard aggregate statistics',
    description:
      'Returns risk distribution, hourly volume, total amount flagged, and ' +
      'top fraudulent senders. Cached in Redis for 10s in production.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  async getStats() {
    const stats = await this.service.getDashboardStats();
    return { success: true, data: stats };
  }

  // ── GET /transactions/fraud-signals ───────────────────────────────────────
  @Get('fraud-signals')
  @ApiOperation({
    summary: 'Fraud signals breakdown',
    description:
      'Returns the top fraud signals detected across all scored transactions ' +
      'with their occurrence percentages.',
  })
  @ApiResponse({ status: 200, description: 'Fraud signals breakdown' })
  async getFraudSignals() {
    const signals = await this.service.getFraudSignals();
    return { success: true, data: signals };
  }

  // ── GET /transactions ─────────────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'List transactions with filters & pagination',
    description:
      'Supports filtering by riskLevel, status, senderId and date range. ' +
      'Results are paginated. Default sort: newest first.',
  })
  @ApiResponse({ status: 200, description: 'Paginated transaction list' })
  async findAll(@Query() query: QueryTransactionDto) {
    const result = await this.service.findAll(query);
    return { success: true, ...result };
  }

  // ── GET /transactions/:txnId ──────────────────────────────────────────────
  @Get(':txnId')
  @ApiOperation({ summary: 'Get a single transaction by UPI txnId' })
  @ApiParam({ name: 'txnId', example: 'UPI1712345678901' })
  @ApiResponse({ status: 200, description: 'Transaction found' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async findOne(@Param('txnId') txnId: string) {
    const txn = await this.service.findOne(txnId);
    return { success: true, data: txn };
  }

  // ── PATCH /transactions/:txnId/clear ─────────────────────────────────────
  @Patch(':txnId/clear')
  @ApiOperation({
    summary: 'Mark a flagged transaction as cleared by analyst',
    description:
      'Sets status to CLEARED. This is the analyst review action — ' +
      'in a production system it would also feed back into model retraining.',
  })
  @ApiParam({ name: 'txnId', example: 'UPI1712345678901' })
  @ApiResponse({ status: 200, description: 'Transaction cleared' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async clear(@Param('txnId') txnId: string) {
    const txn = await this.service.clearTransaction(txnId);
    return { success: true, message: 'Transaction cleared', data: txn };
  }
}