import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { TransactionProcessor } from '../queue/transaction.processor';
import { TRANSACTION_QUEUE } from '../queue/queue.constants';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    BullModule.registerQueue({
      name: TRANSACTION_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
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
