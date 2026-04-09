import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { TransactionRepository } from '../transactions/repositories/transaction.repository';
import { UpdateRiskDto } from '../transactions/dto/transaction.dto';
import { RiskLevel, TransactionStatus } from '../transactions/schemas/transaction.schema';
import { TRANSACTION_QUEUE, SCORE_TRANSACTION_JOB } from './queue.constants';

// ─────────────────────────────────────────────────────────────────────────────
// transaction.processor.ts
//
// BullMQ queue consumer.  Each SCORE_TRANSACTION_JOB:
//  1. Loads the transaction from MongoDB
//  2. Calls the ML microservice (Part 3) via HTTP
//     → In Part 1 we use a rule-based stub so the system works end-to-end
//       without the Python service.  The stub mirrors the same interface so
//       swapping in the real ML service in Part 3 requires zero changes here.
//  3. Writes the risk score back via the repository
//
// Retry strategy: 3 attempts with exponential back-off (2s, 4s, 8s).
// Dead-letter: failed jobs stay in BullMQ's failed set for manual inspection.
//
// Interview talking point:
//  "By decoupling scoring into a queue I can ingest transactions at 99.9%
//   uptime even if the ML service is temporarily down – jobs just accumulate
//   and drain when it recovers.  This is the same pattern used in production
//   payment systems."
// ─────────────────────────────────────────────────────────────────────────────

interface ScoreJobPayload {
  txnId: string;
}

@Injectable()
@Processor(TRANSACTION_QUEUE)
export class TransactionProcessor extends WorkerHost {
  private readonly logger = new Logger(TransactionProcessor.name);

  constructor(
    private readonly repo: TransactionRepository,
    private readonly config: ConfigService,
  ) {
    super();
  }

  // ── Job handler ───────────────────────────────────────────────────────────

  async process(job: Job<ScoreJobPayload>): Promise<void> {
    if (job.name !== SCORE_TRANSACTION_JOB) {
      this.logger.warn(`Skipping unsupported job ${job.name} on queue ${TRANSACTION_QUEUE}`);
      return;
    }

    const { txnId } = job.data;

    // Mark as processing
    await this.repo.updateStatus(txnId, TransactionStatus.PROCESSING);

    // Load full transaction
    const txn = await this.repo.findByTxnId(txnId);
    if (!txn) {
      this.logger.warn(`Job ${job.id}: txn ${txnId} not found – skipping`);
      return;
    }

    // ── ML scoring (stub in Part 1, real HTTP call in Part 3) ────────────
    const riskResult = await this.scoreTransaction(txn);

    // ── Determine status ──────────────────────────────────────────────────
    const fraudThreshold = this.config.get<number>('fraud.riskThreshold') || 70;
    const status =
      riskResult.riskScore >= fraudThreshold
        ? TransactionStatus.FLAGGED
        : TransactionStatus.SCORED;

    // ── Persist result ────────────────────────────────────────────────────
    const update: UpdateRiskDto = {
      ...riskResult,
      status,
      scoredAt: new Date(),
    };
    await this.repo.updateRisk(txnId, update);

    await job.updateProgress(100);
  }

  // ── Rule-based scoring stub ───────────────────────────────────────────────
  // Mirrors the interface of the Python ML service (Part 3).
  // Each signal weight is tunable via the fraudConfig.
  // Returns { riskScore, riskLevel, fraudSignals, riskReason }

  private async scoreTransaction(txn: any): Promise<Omit<UpdateRiskDto, 'status' | 'scoredAt'>> {
    const signals: Record<string, boolean | number> = {
      // Amount anomalies
      large_amount:      txn.amount > 500_000,    // > ₹5,000
      very_large_amount: txn.amount > 2_500_000,  // > ₹25,000

      // Time anomalies
      odd_hour: txn.hourOfDay >= 1 && txn.hourOfDay <= 4,

      // Behavioural
      new_recipient:     txn.isNewRecipient,
      rapid_succession:  txn.recentTxnCount >= 3,
      very_rapid:        txn.recentTxnCount >= 6,

      // Round number heuristic (common in structuring fraud)
      round_number:
        txn.amount >= 1_000_000 && txn.amount % 100_000 === 0,
    };

    // Weighted sum
    const weights: Record<string, number> = {
      large_amount:      15,
      very_large_amount: 25,
      odd_hour:          20,
      new_recipient:     20,
      rapid_succession:  20,
      very_rapid:        35,
      round_number:      15,
    };

    let score = 0;
    const triggered: string[] = [];

    for (const [key, val] of Object.entries(signals)) {
      if (val) {
        score += weights[key] || 0;
        triggered.push(key);
      }
    }

    score = Math.min(score, 100); // cap at 100

    const mediumThreshold = this.config.get<number>('fraud.mediumThreshold') || 40;
    const fraudThreshold  = this.config.get<number>('fraud.riskThreshold')   || 70;

    let riskLevel: RiskLevel;
    if (score >= 90)              riskLevel = RiskLevel.CRITICAL;
    else if (score >= fraudThreshold)  riskLevel = RiskLevel.HIGH;
    else if (score >= mediumThreshold) riskLevel = RiskLevel.MEDIUM;
    else                               riskLevel = RiskLevel.LOW;

    const riskReason =
      triggered.length > 0
        ? triggered.map((s) => s.replace(/_/g, ' ')).join(', ')
        : 'No anomalies detected';

    return { riskScore: score, riskLevel, fraudSignals: signals, riskReason };
  }

  // ── Queue lifecycle hooks ──────────────────────────────────────────────────

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.debug(`Processing job ${job.id} (${job.name}) – txnId: ${job.data.txnId}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, err: Error) {
    if (!job) {
      this.logger.error(`A worker job failed before BullMQ could hydrate the job payload: ${err.message}`);
      return;
    }

    this.logger.error(`Job ${job.id} failed after ${job.attemptsMade} attempts: ${err.message}`);
  }
}
