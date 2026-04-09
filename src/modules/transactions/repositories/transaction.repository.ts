import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, UpdateQuery, SortOrder } from 'mongoose';
import {
  Transaction,
  TransactionDocument,
  RiskLevel,
  TransactionStatus,
} from '../schemas/transaction.schema';
import { CreateTransactionDto, QueryTransactionDto, UpdateRiskDto } from '../dto/transaction.dto';

type CreateTransactionData = Omit<CreateTransactionDto, 'transactionTime'>
  & Pick<Transaction, 'transactionTime'>
  & Partial<Transaction>;

// ─────────────────────────────────────────────────────────────────────────────
// transaction.repository.ts
//
// The Repository Pattern wraps all Mongoose calls so that:
//  1. Services never import Model<> directly → testability
//  2. Query logic is centralised → no scattered .find() calls across files
//  3. Swapping the DB (e.g. to Postgres) only requires changing this file
//
// Interview talking point:
//  "I follow the Repository Pattern so my service layer stays pure business
//   logic. If I ever need to migrate from MongoDB to Postgres I only touch
//   the repository, not the service or the controller."
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class TransactionRepository {
  private readonly logger = new Logger(TransactionRepository.name);

  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  // ── Write ─────────────────────────────────────────────────────────────────

  async create(dto: CreateTransactionData): Promise<TransactionDocument> {
    const doc = new this.transactionModel(dto);
    return doc.save();
  }

  async createMany(docs: Partial<Transaction>[]): Promise<TransactionDocument[]> {
    return this.transactionModel.insertMany(docs) as unknown as TransactionDocument[];
  }

  async updateRisk(txnId: string, risk: UpdateRiskDto): Promise<TransactionDocument | null> {
    return this.transactionModel
      .findOneAndUpdate(
        { txnId },
        { $set: { ...risk, scoredAt: risk.scoredAt || new Date() } },
        { new: true },
      )
      .exec();
  }

  async updateStatus(txnId: string, status: TransactionStatus): Promise<TransactionDocument | null> {
    return this.transactionModel
      .findOneAndUpdate({ txnId }, { $set: { status } }, { new: true })
      .exec();
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  async findByTxnId(txnId: string): Promise<TransactionDocument | null> {
    return this.transactionModel.findOne({ txnId }).exec();
  }

  async findMany(query: QueryTransactionDto): Promise<{
    data: TransactionDocument[];
    total: number;
  }> {
    const filter: FilterQuery<TransactionDocument> = {};

    if (query.riskLevel) filter.riskLevel = query.riskLevel;
    if (query.status) filter.status = query.status;
    if (query.senderId) filter.senderId = query.senderId;

    if (query.from || query.to) {
      filter.transactionTime = {};
      if (query.from) filter.transactionTime.$gte = new Date(query.from);
      if (query.to) filter.transactionTime.$lte = new Date(query.to);
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const sortField = query.sortBy || 'createdAt';
    const sortDir: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.transactionModel.countDocuments(filter).exec(),
    ]);

    return { data: data as unknown as TransactionDocument[], total };
  }

  async findRecentBySender(
    senderId: string,
    withinMinutes: number = 10,
  ): Promise<TransactionDocument[]> {
    const since = new Date(Date.now() - withinMinutes * 60 * 1000);
    return this.transactionModel
      .find({ senderId, transactionTime: { $gte: since } })
      .lean()
      .exec() as unknown as TransactionDocument[];
  }

  async hasReceiverBeenSeenBefore(
    senderId: string,
    receiverId: string,
  ): Promise<boolean> {
    const count = await this.transactionModel.countDocuments({ senderId, receiverId });
    return count > 0;
  }

  // ── Analytics (used by the dashboard stats endpoint) ─────────────────────

  async countByRiskLevel(): Promise<Record<RiskLevel, number>> {
    const results = await this.transactionModel.aggregate([
      { $match: { riskLevel: { $exists: true } } },
      { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
    ]);

    const map = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } as Record<RiskLevel, number>;
    results.forEach((r) => { if (r._id) map[r._id as RiskLevel] = r.count; });
    return map;
  }

  async getHourlyTxnVolume(hoursBack: number = 24): Promise<{ hour: number; count: number; flagged: number }[]> {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return this.transactionModel.aggregate([
      { $match: { transactionTime: { $gte: since } } },
      {
        $group: {
          _id: { $hour: '$transactionTime' },
          count: { $sum: 1 },
          flagged: {
            $sum: {
              $cond: [{ $in: ['$riskLevel', [RiskLevel.HIGH, RiskLevel.CRITICAL]] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { hour: '$_id', count: 1, flagged: 1, _id: 0 } },
    ]);
  }

  async getTotalAmountFlagged(): Promise<number> {
    const result = await this.transactionModel.aggregate([
      { $match: { riskLevel: { $in: [RiskLevel.HIGH, RiskLevel.CRITICAL] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result[0]?.total || 0;
  }

  async getTopFlaggedSenders(limit: number = 10): Promise<{ senderId: string; count: number }[]> {
    return this.transactionModel.aggregate([
      { $match: { riskLevel: { $in: [RiskLevel.HIGH, RiskLevel.CRITICAL] } } },
      { $group: { _id: '$senderId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { senderId: '$_id', count: 1, _id: 0 } },
    ]);
  }
}
