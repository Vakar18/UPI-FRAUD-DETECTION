import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { TransactionRepository } from '../transactions/repositories/transaction.repository';
import { UpdateRiskDto } from '../transactions/dto/transaction.dto';
import { TransactionStatus } from '../transactions/schemas/transaction.schema';
import { MlService } from '../ml/ml.service';
import { AlertPublisher } from '../gateway/alert-publisher.service';
import { TRANSACTION_QUEUE, SCORE_TRANSACTION_JOB } from './queue.constants';

// ─────────────────────────────────────────────────────────────────────────────
// transaction.processor.ts  (Part 3 – with AlertPublisher)
//
// WorkerHost is the BullMQ-native base class.
// Each SCORE_TRANSACTION_JOB:
//   1. Marks the transaction PROCESSING
//   2. Loads the document from MongoDB
//   3. Calls MlService.score() → HTTP to Python, rule-based fallback
//   4. Writes risk result back via repository
//   5. Sets final status SCORED | FLAGGED
//   6. Calls AlertPublisher.notify() → WebSocket emission
//
// Retry: 3 attempts, exponential back-off 2 s / 4 s / 8 s (set in AppModule)
// Dead-letter: failed jobs stay visible in BullBoard at /queues
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
    private readonly mlService: MlService,
    private readonly alertPublisher: AlertPublisher,
  ) {
    super();
  }

  // ── Main job handler ──────────────────────────────────────────────────────

  async process(job: Job<ScoreJobPayload>): Promise<void> {
    if (job.name !== SCORE_TRANSACTION_JOB) return;

    const { txnId } = job.data;
    this.logger.debug(`Processing job ${job.id} for txn ${txnId}`);

    // 1. Mark processing
    await this.repo.updateStatus(txnId, TransactionStatus.PROCESSING);
    await job.updateProgress(10);

    // 2. Load full document
    const txn = await this.repo.findByTxnId(txnId);
    if (!txn) {
      this.logger.warn(`Job ${job.id}: txn ${txnId} not found – skipping`);
      return;
    }
    await job.updateProgress(30);

    // 3. Score via ML service (HTTP → Python, with rule-based fallback)
    const riskResult = await this.mlService.score(txn);
    await job.updateProgress(80);

    // 4. Determine final status
    const status =
      riskResult.riskScore >= this.mlService.getFraudThreshold()
        ? TransactionStatus.FLAGGED
        : TransactionStatus.SCORED;

    // 5. Persist risk result
    const update: UpdateRiskDto = {
      ...riskResult,
      status,
      scoredAt: new Date(),
    };
    const updated = await this.repo.updateRisk(txnId, update);
    await job.updateProgress(95);

    // 6. Emit WebSocket events (fraud-alert + txn-scored)
    if (updated) {
      this.alertPublisher.notify(updated);
    }

    await job.updateProgress(100);
    this.logger.log(
      `Scored txn ${txnId} → ${riskResult.riskLevel} (${riskResult.riskScore}) | ${riskResult.riskReason}`,
    );
  }

  // ── Worker lifecycle events ───────────────────────────────────────────────

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.debug(`Job active: ${job.id} (${job.name})`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job completed: ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Job failed: ${job.id} | attempt ${job.attemptsMade} | ${err.message}`,
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`Job stalled: ${jobId} – will be retried`);
  }
}