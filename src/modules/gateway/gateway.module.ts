import { Module, forwardRef } from '@nestjs/common';
import { FraudAlertGateway } from './fraud-alert.gateway';
import { AlertPublisher } from './alert-publisher.service';
import { StatsScheduler } from './stats-scheduler.service';
import { TransactionModule } from '../transactions/transaction.module';

// ─────────────────────────────────────────────────────────────────────────────
// gateway.module.ts
//
// Circular dependency resolution:
//   TransactionModule imports GatewayModule  (to get AlertPublisher)
//   GatewayModule imports TransactionModule  (so StatsScheduler can call
//   TransactionService.getDashboardStats)
//
// Both sides use forwardRef(() => OtherModule) to break the cycle.
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  imports: [forwardRef(() => TransactionModule)],
  providers: [FraudAlertGateway, AlertPublisher, StatsScheduler],
  exports: [AlertPublisher, FraudAlertGateway],
})
export class GatewayModule {}
