import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionService } from '../transactions/transaction.service';
import { CreateTransactionDto } from '../transactions/dto/transaction.dto';

// ─────────────────────────────────────────────────────────────────────────────
// simulator.service.ts
//
// Fires mock UPI transactions on a configurable interval so the dashboard
// has live data to display during a demo.
//
// The generator intentionally injects anomalies ~15% of the time so the
// ML scoring pipeline flags a realistic proportion of transactions as
// HIGH / CRITICAL risk.
//
// VPAs, device IDs and cities are drawn from realistic Indian datasets
// so the demo looks credible to interviewers familiar with UPI.
//
// SIMULATOR_ENABLED=false disables the entire module in production.
// ─────────────────────────────────────────────────────────────────────────────

const INDIAN_CITIES = [
  { city: 'Mumbai', state: 'Maharashtra' },
  { city: 'Delhi', state: 'Delhi' },
  { city: 'Bangalore', state: 'Karnataka' },
  { city: 'Hyderabad', state: 'Telangana' },
  { city: 'Chennai', state: 'Tamil Nadu' },
  { city: 'Kolkata', state: 'West Bengal' },
  { city: 'Pune', state: 'Maharashtra' },
  { city: 'Ahmedabad', state: 'Gujarat' },
  { city: 'Jaipur', state: 'Rajasthan' },
  { city: 'Lucknow', state: 'Uttar Pradesh' },
];

const BANKS = ['oksbi', 'okhdfcbank', 'okicici', 'okaxis', 'ybl', 'paytm', 'ibl', 'upi'];

const MERCHANT_VPAS = [
  'swiggy@icici', 'zomato@kotak', 'amazon@apl', 'flipkart@ybl',
  'irctc@sbi', 'phonepe@ybl', 'gpay@oksbi', 'paytm@paytm',
];

const DEVICE_MODELS = [
  'Samsung Galaxy S23', 'iPhone 15 Pro', 'OnePlus 12',
  'Pixel 8', 'Redmi Note 13', 'Realme 12 Pro',
];

const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

@Injectable()
export class SimulatorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SimulatorService.name);
  private timer: NodeJS.Timeout | null = null;
  private txnCounter = 0;

  constructor(
    private readonly txnService: TransactionService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const enabled = this.config.get<boolean>('simulator.enabled');
    if (!enabled) {
      this.logger.warn('Simulator disabled (SIMULATOR_ENABLED=false)');
      return;
    }
    const intervalMs = this.config.get<number>('simulator.intervalMs') || 3000;
    this.logger.log(`Simulator started – firing every ${intervalMs}ms`);
    this.timer = setInterval(() => this.fireTransactions(), intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // ── Main fire loop ─────────────────────────────────────────────────────────

  private async fireTransactions() {
    const batchSize = this.config.get<number>('simulator.batchSize') || 1;
    for (let i = 0; i < batchSize; i++) {
      try {
        const dto = this.generateTransaction();
        await this.txnService.ingest(dto);
        this.txnCounter++;
      } catch (err) {
        // 409 Conflict is expected if the same txnId is generated twice
        if (err?.status !== 409) {
          this.logger.error(`Simulator error: ${err.message}`);
        }
      }
    }
  }

  // ── Transaction generator ─────────────────────────────────────────────────

  private generateTransaction(): CreateTransactionDto {
    const isAnomaly = Math.random() < 0.15; // ~15% anomalous
    const location = rand(INDIAN_CITIES);

    const handle = `user${randInt(1000, 9999)}`;
    const bank = rand(BANKS);
    const senderId = `${handle}@${bank}`;

    // Anomalies: very large amount, odd hour, known-bad merchant-like VPA
    const receiverId = isAnomaly
      ? `cashout${randInt(100, 999)}@${rand(BANKS)}`
      : rand(MERCHANT_VPAS);

    const now = new Date();
    // Anomaly: back-date to a 1–4 AM slot
    if (isAnomaly && Math.random() < 0.5) {
      now.setHours(randInt(1, 4), randInt(0, 59));
    }

    const amount = isAnomaly
      ? randInt(2_500_000, 10_000_000) // ₹25,000–₹1,00,000 (in paise)
      : randInt(100, 1_500_000);       // ₹1–₹15,000

    return {
      txnId: `SIM${Date.now()}${randInt(100, 999)}`,
      senderId,
      receiverId,
      amount,
      currency: 'INR',
      deviceId: `DV-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      city: location.city,
      state: location.state,
      ipAddress: `${randInt(1,255)}.${randInt(0,255)}.${randInt(0,255)}.${randInt(1,254)}`,
      deviceModel: rand(DEVICE_MODELS),
      transactionTime: now.toISOString(),
    };
  }

  // ── Public accessor (used by health check) ────────────────────────────────
  getCount() { return this.txnCounter; }
}