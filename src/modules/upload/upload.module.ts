import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { TransactionModule } from '../transactions/transaction.module';
import { TRANSACTION_QUEUE } from '../queue/queue.constants';

// ─────────────────────────────────────────────────────────────────────────────
// upload.module.ts
//
// Imports TransactionModule to get TransactionRepository (for bulk save).
// Registers TRANSACTION_QUEUE so UploadService can enqueue scoring jobs.
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  imports: [
    TransactionModule,
    BullModule.registerQueue({ name: TRANSACTION_QUEUE }),
  ],
  controllers: [UploadController],
  providers:   [UploadService],
})
export class UploadModule {}