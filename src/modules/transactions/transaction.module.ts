import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { TransactionProcessor } from '../queue/transaction.processor';
import { MlModule } from '../ml/ml.module';
import { GatewayModule } from '../gateway/gateway.module';
import { TRANSACTION_QUEUE } from '../queue/queue.constants';

// ─────────────────────────────────────────────────────────────────────────────
// transaction.module.ts  (Part 3 – adds GatewayModule for AlertPublisher)
//
// forwardRef() on GatewayModule breaks the circular dependency:
//   TransactionModule → GatewayModule → TransactionModule (for StatsScheduler)
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    BullModule.registerQueue({ name: TRANSACTION_QUEUE }),
    MlModule,
    forwardRef(() => GatewayModule),
  ],
  controllers: [TransactionController],
  providers: [
    TransactionRepository,
    TransactionService,
    TransactionProcessor,
  ],
  exports: [TransactionService, TransactionRepository],
})
export class TransactionModule {}