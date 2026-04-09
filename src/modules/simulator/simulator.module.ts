import { Module } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { TransactionModule } from '../transactions/transaction.module';

@Module({
  imports: [TransactionModule],
  providers: [SimulatorService],
  exports: [SimulatorService],
})
export class SimulatorModule {}