import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { RiskLevel } from '../transactions/schemas/transaction.schema';
import { UpdateRiskDto } from '../transactions/dto/transaction.dto';

// ─────────────────────────────────────────────────────────────────────────────
// ml.service.ts
//
// Single injectable responsible for scoring a transaction.
//
// Strategy (priority order):
//  1. POST /predict  to Python ML microservice
//     baseURL is set in MlModule.HttpModule so we just use the path here
//  2. If Python is unavailable / times out → rule-based fallback
//     so the queue never stalls waiting for an external service
//
// Interview talking point:
//  "I wrap the HTTP call in a 5 s RxJS timeout. If the Python service is
//   slow or down the fallback kicks in immediately and tags the result with
//   riskReason containing '[fallback]' so analysts can filter those rows."
// ─────────────────────────────────────────────────────────────────────────────

export type RiskResult = Omit<UpdateRiskDto, 'status' | 'scoredAt'>;

interface MlServiceResponse {
  risk_score:    number;
  risk_level:    string;
  fraud_signals: Record<string, boolean | number>;
  risk_reason:   string;
  model_version: string;
}

@Injectable()
export class MlService {
  private readonly logger         = new Logger(MlService.name);
  private readonly fraudThreshold: number;
  private readonly mediumThreshold: number;
  private readonly mlTimeout: number;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.fraudThreshold  = this.config.get<number>('fraud.riskThreshold')   ?? 70;
    this.mediumThreshold = this.config.get<number>('fraud.mediumThreshold') ?? 40;
    this.mlTimeout       = this.config.get<number>('ml.timeout')            ?? 5000;
  }

  getFraudThreshold(): number {
    return this.fraudThreshold;
  }

  // ── Public ────────────────────────────────────────────────────────────────

  async score(txn: any): Promise<RiskResult> {
    try {
      return await this.callMlService(txn);
    } catch (err) {
      const reason = err instanceof TimeoutError ? 'timeout' : err.message;
      this.logger.warn(`ML service unavailable (${reason}) – falling back to rule-based scorer`);
      return this.ruleBasedFallback(txn);
    }
  }

  // ── HTTP call ─────────────────────────────────────────────────────────────

  private async callMlService(txn: any): Promise<RiskResult> {
    const txnTime   = new Date(txn.transactionTime);
    const payload   = {
      txn_id:           txn.txnId,
      sender_id:        txn.senderId,
      receiver_id:      txn.receiverId,
      amount:           txn.amount,
      hour_of_day:      txn.hourOfDay ?? txnTime.getHours(),
      recent_txn_count: txn.recentTxnCount ?? 0,
      is_new_recipient: txn.isNewRecipient ?? false,
      city:             txn.city,
      day_of_week:      txnTime.getDay(),
    };

    const response = await firstValueFrom(
      this.http.post<MlServiceResponse>('/predict', payload).pipe(
        timeout(this.mlTimeout),
        catchError((err) => { throw err; }),
      ),
    );

    const d = response.data;
    this.logger.debug(
      `ML scored ${txn.txnId}: score=${d.risk_score} level=${d.risk_level} model=${d.model_version}`,
    );

    return {
      riskScore:    Math.round(d.risk_score),
      riskLevel:    d.risk_level as RiskLevel,
      fraudSignals: d.fraud_signals,
      riskReason:   `[${d.model_version}] ${d.risk_reason}`,
    };
  }

  // ── Rule-based fallback ───────────────────────────────────────────────────

  ruleBasedFallback(txn: any): RiskResult {
    const signals: Record<string, boolean | number> = {
      large_amount:      txn.amount > 500_000,
      very_large_amount: txn.amount > 2_500_000,
      odd_hour:          txn.hourOfDay >= 1 && txn.hourOfDay <= 4,
      new_recipient:     Boolean(txn.isNewRecipient),
      rapid_succession:  txn.recentTxnCount >= 3,
      very_rapid:        txn.recentTxnCount >= 6,
      round_number:      txn.amount >= 1_000_000 && txn.amount % 100_000 === 0,
    };

    const weights: Record<string, number> = {
      large_amount: 15, very_large_amount: 25, odd_hour: 20,
      new_recipient: 20, rapid_succession: 20, very_rapid: 35, round_number: 15,
    };

    let score = 0;
    const triggered: string[] = [];

    for (const [key, val] of Object.entries(signals)) {
      if (val) { score += weights[key] ?? 0; triggered.push(key); }
    }
    score = Math.min(score, 100);

    let riskLevel: RiskLevel;
    if      (score >= 90)                    riskLevel = RiskLevel.CRITICAL;
    else if (score >= this.fraudThreshold)   riskLevel = RiskLevel.HIGH;
    else if (score >= this.mediumThreshold)  riskLevel = RiskLevel.MEDIUM;
    else                                     riskLevel = RiskLevel.LOW;

    const riskReason = triggered.length
      ? `[fallback] ${triggered.map((s) => s.replace(/_/g, ' ')).join(', ')}`
      : '[fallback] no anomalies detected';

    this.logger.debug(`Rule-based: score=${score} level=${riskLevel}`);
    return { riskScore: score, riskLevel, fraudSignals: signals, riskReason };
  }
}