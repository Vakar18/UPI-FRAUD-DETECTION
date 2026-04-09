import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { SimulatorModule } from '../simulator/simulator.module';

@Module({
  imports: [TerminusModule, SimulatorModule],
  controllers: [HealthController],
})
export class HealthModule {}