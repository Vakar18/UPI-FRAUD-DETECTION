import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SimulatorService } from '../simulator/simulator.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
    private readonly simulator: SimulatorService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness + readiness probe' })
  check() {
    return this.health.check([
      () => this.mongoose.pingCheck('mongodb'),
    ]);
  }

  @Get('simulator')
  @ApiOperation({ summary: 'Simulator stats – transactions fired so far' })
  simulatorStats() {
    return {
      simulatorTxnCount: this.simulator.getCount(),
      uptime: process.uptime(),
    };
  }
}