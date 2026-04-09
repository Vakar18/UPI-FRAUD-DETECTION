import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TransactionRepository } from './repositories/transaction.repository';
import {
  CreateTransactionDto,
  QueryTransactionDto,
  UpdateRiskDto,
  PaginatedResponseDto,
} from './dto/transaction.dto';
import { TransactionDocument, TransactionStatus } from './schemas/transaction.schema';
import { TRANSACTION_QUEUE, SCORE_TRANSACTION_JOB } from '../queue/queue.constants';

// ─────────────────────────────────────────────────────────────────────────────
// transaction.service.ts
//
// Pure business logic.  No Mongoose imports here – all DB access goes through
// the repository.  No HTTP concepts here – all HTTP concerns stay in the
// controller.
//
// Flow for a new transaction:
//  1. Validate uniqueness (throws 409 if duplicate txnId)
//  2. Enrich with behavioural context (recent count, new recipient flag)
//  3. Persist with status=PENDING
//  4. Enqueue SCORE_TRANSACTION_JOB → queue processor calls ML engine
//  5. Return saved document immediately (async scoring)
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private readonly repo: TransactionRepository,
    @InjectQueue(TRANSACTION_QUEUE) private readonly txnQueue: Queue,
  ) {}

  // ── Ingest a new transaction ───────────────────────────────────────────────

  async ingest(dto: CreateTransactionDto): Promise<TransactionDocument> {
    // 1. Idempotency guard
    const existing = await this.repo.findByTxnId(dto.txnId);
    if (existing) {
      throw new ConflictException(`Transaction ${dto.txnId} already exists`);
    }

    // 2. Behavioural enrichment (computed synchronously before save)
    const txnTime = new Date(dto.transactionTime);
    const [recentTxns, isNewRecipient] = await Promise.all([
      this.repo.findRecentBySender(dto.senderId, 10),
      this.repo.hasReceiverBeenSeenBefore(dto.senderId, dto.receiverId).then((seen) => !seen),
    ]);

    // 3. Persist
    const saved = await this.repo.create({
      ...dto,
      transactionTime: txnTime,
      hourOfDay: txnTime.getHours(),
      recentTxnCount: recentTxns.length,
      isNewRecipient,
      status: TransactionStatus.PENDING,
    });

    // 4. Enqueue for ML scoring (non-blocking)
    await this.txnQueue.add(
      SCORE_TRANSACTION_JOB,
      { txnId: saved.txnId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`Ingested txn ${saved.txnId} → queued for scoring`);
    return saved;
  }

  // ── Query / listing ───────────────────────────────────────────────────────

  async findAll(query: QueryTransactionDto): Promise<PaginatedResponseDto<TransactionDocument>> {
    const { data, total } = await this.repo.findMany(query);
    const limit = query.limit || 20;
    return {
      data,
      total,
      page: query.page || 1,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(txnId: string): Promise<TransactionDocument> {
    const txn = await this.repo.findByTxnId(txnId);
    if (!txn) throw new NotFoundException(`Transaction ${txnId} not found`);
    return txn;
  }

  // ── Risk update (called by queue processor, not HTTP) ─────────────────────

  async applyRiskScore(txnId: string, risk: UpdateRiskDto): Promise<TransactionDocument> {
    const updated = await this.repo.updateRisk(txnId, risk);
    if (!updated) throw new NotFoundException(`Transaction ${txnId} not found for risk update`);

    this.logger.log(
      `Scored txn ${txnId} → ${risk.riskLevel} (${risk.riskScore}) – ${risk.riskReason}`,
    );
    return updated;
  }

  // ── Analyst actions ───────────────────────────────────────────────────────

  async clearTransaction(txnId: string): Promise<TransactionDocument> {
    const txn = await this.repo.findByTxnId(txnId);
    if (!txn) throw new NotFoundException(`Transaction ${txnId} not found`);
    const updated = await this.repo.updateStatus(txnId, TransactionStatus.CLEARED);
    if (!updated) throw new NotFoundException(`Transaction ${txnId} not found`);
    this.logger.log(`Analyst cleared txn ${txnId}`);
    return updated;
  }

  // ── Dashboard analytics ───────────────────────────────────────────────────

  async getDashboardStats() {
    const [byRisk, hourly, totalFlagged, topSenders] = await Promise.all([
      this.repo.countByRiskLevel(),
      this.repo.getHourlyTxnVolume(24),
      this.repo.getTotalAmountFlagged(),
      this.repo.getTopFlaggedSenders(5),
    ]);

    return {
      riskDistribution: byRisk,
      hourlyVolume: hourly,
      totalAmountFlagged: totalFlagged,
      topFlaggedSenders: topSenders,
      generatedAt: new Date(),
    };
  }
}
