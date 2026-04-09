import { Injectable, Logger } from '@nestjs/common';
import {
  FraudAlertGateway,
  FraudAlertPayload,
  TxnScoredPayload,
} from './fraud-alert.gateway';
import { RiskLevel, TransactionDocument } from '../transactions/schemas/transaction.schema';

// ─────────────────────────────────────────────────────────────────────────────
// alert-publisher.service.ts
//
// Thin service that turns scored transactions into WebSocket side effects.
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AlertPublisher {
  private readonly logger = new Logger(AlertPublisher.name);

  constructor(private readonly gateway: FraudAlertGateway) {}

  notify(txn: TransactionDocument): void {
    const isHighRisk = [RiskLevel.HIGH, RiskLevel.CRITICAL].includes(txn.riskLevel);

    const scored: TxnScoredPayload = {
      txnId: txn.txnId,
      riskScore: txn.riskScore,
      riskLevel: txn.riskLevel,
      status: txn.status,
      scoredAt: (txn.scoredAt || new Date()).toISOString(),
    };
    this.gateway.publishScored(scored);

    if (!isHighRisk) {
      return;
    }

    const alert: FraudAlertPayload = {
      txnId: txn.txnId,
      senderId: txn.senderId,
      receiverId: txn.receiverId,
      amount: txn.amount,
      city: txn.city,
      riskScore: txn.riskScore,
      riskLevel: txn.riskLevel,
      riskReason: txn.riskReason || '',
      fraudSignals: txn.fraudSignals || {},
      scoredAt: (txn.scoredAt || new Date()).toISOString(),
    };

    this.gateway.publishAlert(alert);
    this.logger.warn(
      `Published fraud alert: ${txn.txnId} | ${txn.riskLevel} | INR ${(txn.amount / 100).toFixed(2)}`,
    );
  }
}
