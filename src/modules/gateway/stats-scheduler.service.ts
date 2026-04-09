import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FraudAlertGateway } from './fraud-alert.gateway';
import { TransactionService } from '../transactions/transaction.service';

// ─────────────────────────────────────────────────────────────────────────────
// stats-scheduler.service.ts
//
// Emits live dashboard stats every 10 seconds while clients are connected.
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class StatsScheduler {
  private readonly logger = new Logger(StatsScheduler.name);

  constructor(
    private readonly gateway: FraudAlertGateway,
    private readonly txnService: TransactionService,
  ) {}

  @Cron('*/10 * * * * *')
  async pushStatsUpdate(): Promise<void> {
    if (this.gateway.getConnectedCount() === 0) {
      return;
    }

    try {
      const stats = await this.txnService.getDashboardStats();
      this.gateway.publishStatsUpdate(stats as Record<string, unknown>);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Stats push failed: ${message}`);
    }
  }
}
