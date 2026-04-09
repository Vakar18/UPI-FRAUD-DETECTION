import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

// ─────────────────────────────────────────────────────────────────────────────
// transaction.schema.ts
//
// Mongoose schema for a UPI transaction.
//
// Design decisions:
//  • riskScore / riskLevel / fraudSignals are written AFTER the ML engine
//    processes the transaction via the BullMQ queue.  They are optional at
//    creation time so the ingestion endpoint can persist fast and respond
//    immediately (async processing pattern).
//  • Indexes on senderId, receiverId, createdAt and riskLevel cover the
//    most common dashboard queries without over-indexing.
//  • The schema is intentionally flat (no nested sub-docs) so aggregation
//    pipelines for the analytics module stay simple.
// ─────────────────────────────────────────────────────────────────────────────

export type TransactionDocument = Transaction & Document;

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TransactionStatus {
  PENDING = 'PENDING',       // just ingested, queued for ML scoring
  PROCESSING = 'PROCESSING', // ML engine working on it
  SCORED = 'SCORED',         // ML engine returned a score
  FLAGGED = 'FLAGGED',       // score >= FRAUD_RISK_THRESHOLD
  CLEARED = 'CLEARED',       // reviewed by analyst and cleared
  FAILED = 'FAILED',         // processing error
}

@Schema({ timestamps: true, collection: 'transactions' })
export class Transaction {

  @ApiProperty({ example: 'UPI1712345678901', description: 'Unique UPI transaction reference' })
  @Prop({ required: true, unique: true, index: true })
  txnId: string;

  @ApiProperty({ example: 'vakar@oksbi', description: 'Sender Virtual Payment Address' })
  @Prop({ required: true, index: true })
  senderId: string;

  @ApiProperty({ example: 'merchant@hdfc', description: 'Receiver Virtual Payment Address' })
  @Prop({ required: true, index: true })
  receiverId: string;

  @ApiProperty({ example: 15000, description: 'Amount in INR paise (multiply by 100)' })
  @Prop({ required: true, min: 1 })
  amount: number;

  @ApiProperty({ example: 'INR' })
  @Prop({ default: 'INR' })
  currency: string;

  // ── Device & Location context ─────────────────────────────────────────────

  @ApiProperty({ example: 'DV-A1B2C3D4', description: 'Device fingerprint ID' })
  @Prop({ required: true })
  deviceId: string;

  @ApiProperty({ example: 'Mumbai', description: 'City derived from device GPS / IP' })
  @Prop({ required: true })
  city: string;

  @ApiProperty({ example: 'Maharashtra' })
  @Prop({ required: true })
  state: string;

  @ApiProperty({ example: '192.168.1.1' })
  @Prop()
  ipAddress: string;

  @ApiProperty({ example: 'Android 13 / Samsung Galaxy S23' })
  @Prop()
  deviceModel: string;

  // ── Fraud-scoring fields (populated by ML queue processor) ────────────────

  @ApiProperty({ enum: RiskLevel, example: RiskLevel.LOW })
  @Prop({ enum: RiskLevel, index: true })
  riskLevel: RiskLevel;

  @ApiProperty({ example: 34, description: 'ML risk score 0–100' })
  @Prop({ min: 0, max: 100 })
  riskScore: number;

  @ApiProperty({
    example: { unusual_amount: true, odd_hour: false },
    description: 'Individual signal breakdown from ML engine',
  })
  @Prop({ type: Object })
  fraudSignals: Record<string, boolean | number>;

  @ApiProperty({ example: 'Unusual amount for sender profile' })
  @Prop()
  riskReason: string;

  // ── Status tracking ───────────────────────────────────────────────────────

  @ApiProperty({ enum: TransactionStatus, example: TransactionStatus.PENDING })
  @Prop({ enum: TransactionStatus, default: TransactionStatus.PENDING, index: true })
  status: TransactionStatus;

  @ApiProperty({ description: 'ISO timestamp when ML scoring completed' })
  @Prop()
  scoredAt: Date;

  @ApiProperty({ description: 'ISO timestamp of the original UPI transaction' })
  @Prop({ required: true })
  transactionTime: Date;

  // ── Behavioural context (computed at ingestion time) ──────────────────────

  @ApiProperty({ example: 3, description: 'Number of txns by this sender in last 10 minutes' })
  @Prop({ default: 0 })
  recentTxnCount: number;

  @ApiProperty({ example: false, description: 'True if receiver VPA has never been seen before' })
  @Prop({ default: false })
  isNewRecipient: boolean;

  @ApiProperty({ example: 3, description: 'Hour of day (0-23) the transaction was initiated' })
  @Prop()
  hourOfDay: number;

  // Mongoose auto-adds createdAt / updatedAt via { timestamps: true }
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// ── Compound indexes for common dashboard queries ─────────────────────────
TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ riskLevel: 1, createdAt: -1 });
TransactionSchema.index({ senderId: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, riskLevel: 1 });
