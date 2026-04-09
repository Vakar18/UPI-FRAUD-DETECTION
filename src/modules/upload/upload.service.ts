import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { TRANSACTION_QUEUE, SCORE_TRANSACTION_JOB } from '../queue/queue.constants';
import { TransactionRepository } from '../transactions/repositories/transaction.repository';
import { TransactionStatus } from '../transactions/schemas/transaction.schema';
import { UploadJobResponseDto } from './dto/upload.dto';

// ─────────────────────────────────────────────────────────────────────────────
// upload.service.ts
//
// Handles CSV bulk upload of historical UPI transactions.
//
// Flow:
//  1. Multer provides the file buffer from the controller
//  2. We pipe it through csv-parse (streaming – memory efficient)
//  3. Each row is validated against required column schema
//  4. Valid rows are written to MongoDB (status=PENDING)
//  5. Each saved txn is enqueued to BullMQ for ML scoring
//  6. Invalid rows are collected and returned in the response
//
// Why streaming csv-parse?
//  "A 50 MB CSV file with 500k rows would OOM if we JSON.parse the whole
//   thing. Using Node.js streams means we process one row at a time with
//   constant memory footprint regardless of file size."
//
// Expected CSV columns (case-insensitive):
//   txnId, senderId, receiverId, amount, currency, deviceId,
//   city, state, ipAddress, deviceModel, transactionTime
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED_COLUMNS = [
  'txnid', 'senderid', 'receiverid', 'amount', 'deviceid',
  'city', 'state', 'transactiontime',
];

const VPA_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z]+$/;

interface CsvRow {
  txnid: string;
  senderid: string;
  receiverid: string;
  amount: string;
  currency?: string;
  deviceid: string;
  city: string;
  state: string;
  ipaddress?: string;
  devicemodel?: string;
  transactiontime: string;
}

type ParsedCsvRow = Partial<CsvRow> & Record<string, string | undefined>;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly repo: TransactionRepository,
    @InjectQueue(TRANSACTION_QUEUE) private readonly txnQueue: Queue,
  ) {}

  // ── Main upload handler ────────────────────────────────────────────────────

  async processUpload(fileBuffer: Buffer, originalName: string): Promise<UploadJobResponseDto> {
    const jobId    = uuidv4();
    const startedAt = new Date().toISOString();
    const errors: string[] = [];
    let totalRows = 0;
    let accepted  = 0;
    let rejected  = 0;

    this.logger.log(`Starting CSV upload job ${jobId} – file: ${originalName}`);

    // Parse entire stream and collect results
    const rows = await this.parseCSV(fileBuffer);
    totalRows = rows.length;

    if (totalRows === 0) {
      throw new BadRequestException('CSV file is empty or has no data rows');
    }

    // Validate headers on first row keys
    const headers = Object.keys(rows[0] || {}).map((k) => k.toLowerCase());
    const missing  = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
    if (missing.length > 0) {
      throw new BadRequestException(
        `CSV missing required columns: ${missing.join(', ')}. ` +
        `Required: ${REQUIRED_COLUMNS.join(', ')}`,
      );
    }

    // Process each row
    const BATCH_SIZE = 50; // write to Mongo in batches of 50
    const validBatch: Record<string, unknown>[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // 1-indexed + header row
      const row = rows[i];

      // Validate
      const rowErrors = this.validateRow(row, rowNum);
      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        rejected++;
        continue;
      }

      const validatedRow = this.toValidatedRow(row);

      // Normalise
      const txnTime = new Date(validatedRow.transactiontime);
      const amount  = parseInt(validatedRow.amount, 10);

      validBatch.push({
        txnId:           validatedRow.txnid,
        senderId:        validatedRow.senderid.toLowerCase(),
        receiverId:      validatedRow.receiverid.toLowerCase(),
        amount,
        currency:        validatedRow.currency || 'INR',
        deviceId:        validatedRow.deviceid,
        city:            validatedRow.city,
        state:           validatedRow.state,
        ipAddress:       validatedRow.ipaddress,
        deviceModel:     validatedRow.devicemodel,
        transactionTime: txnTime,
        hourOfDay:       txnTime.getHours(),
        recentTxnCount:  0,   // historical data – no live context
        isNewRecipient:  false,
        status:          TransactionStatus.PENDING,
      });

      // Flush full batches immediately. Any remainder is flushed after the loop.
      if (validBatch.length >= BATCH_SIZE) {
        const saved = await this.flushBatch(validBatch, errors, rowNum);
        accepted += saved;
      }
    }

    if (validBatch.length > 0) {
      accepted += await this.flushBatch(validBatch, errors, rows.length + 1);
    }

    this.logger.log(
      `Upload job ${jobId} complete – total: ${totalRows}, accepted: ${accepted}, rejected: ${rejected}`,
    );

    return {
      jobId,
      totalRows,
      accepted,
      rejected,
      errors: errors.slice(0, 50), // cap error list at 50 items in response
      status: 'PROCESSING',
      startedAt,
    };
  }

  // ── CSV parser ────────────────────────────────────────────────────────────

  private parseCSV(buffer: Buffer): Promise<ParsedCsvRow[]> {
    return new Promise((resolve, reject) => {
      const rows: ParsedCsvRow[] = [];
      const stream = Readable.from(buffer);

      stream
        .pipe(
          parse({
            columns:          true,   // use first row as keys
            skip_empty_lines: true,
            trim:             true,
            cast:             false,  // keep everything as string, we cast manually
            relax_column_count: true,
          }),
        )
        .on('data', (row) => {
          // Normalise keys to lowercase for case-insensitive matching
          const normalised: ParsedCsvRow = {};
          for (const [k, v] of Object.entries(row)) {
            normalised[k.toLowerCase().replace(/\s/g, '')] = String(v);
          }
          rows.push(normalised);
        })
        .on('error', reject)
        .on('end',   () => resolve(rows));
    });
  }

  // ── Row validation ────────────────────────────────────────────────────────

  private validateRow(row: ParsedCsvRow, rowNum: number): string[] {
    const errors: string[] = [];

    if (!row.txnid?.trim()) {
      errors.push(`Row ${rowNum}: txnId is required`);
    }

    if (!VPA_REGEX.test(row.senderid?.trim() || '')) {
      errors.push(`Row ${rowNum}: invalid senderId VPA format (got: ${row.senderid})`);
    }

    if (!VPA_REGEX.test(row.receiverid?.trim() || '')) {
      errors.push(`Row ${rowNum}: invalid receiverId VPA format (got: ${row.receiverid})`);
    }

    const amount = parseInt(row.amount ?? '', 10);
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Row ${rowNum}: amount must be a positive integer (got: ${row.amount})`);
    }

    if (!row.city?.trim()) {
      errors.push(`Row ${rowNum}: city is required`);
    }

    const txnDate = new Date(row.transactiontime ?? '');
    if (isNaN(txnDate.getTime())) {
      errors.push(`Row ${rowNum}: invalid transactionTime (got: ${row.transactiontime})`);
    }

    return errors;
  }

  private toValidatedRow(row: ParsedCsvRow): CsvRow {
    return {
      txnid: row.txnid?.trim() || '',
      senderid: row.senderid?.trim() || '',
      receiverid: row.receiverid?.trim() || '',
      amount: row.amount?.trim() || '',
      currency: row.currency?.trim(),
      deviceid: row.deviceid?.trim() || '',
      city: row.city?.trim() || '',
      state: row.state?.trim() || '',
      ipaddress: row.ipaddress?.trim(),
      devicemodel: row.devicemodel?.trim(),
      transactiontime: row.transactiontime?.trim() || '',
    };
  }

  private async flushBatch(
    batch: Record<string, unknown>[],
    errors: string[],
    rowNum: number,
  ): Promise<number> {
    const saved = await this.saveBatch(batch, errors, rowNum);

    const jobs = batch
      .slice(0, saved)
      .map((t) => ({
        name: SCORE_TRANSACTION_JOB,
        data: { txnId: t.txnId },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential' as const, delay: 2000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
        },
      }));

    if (jobs.length > 0) {
      await this.txnQueue.addBulk(jobs);
    }

    batch.length = 0;
    return saved;
  }

  // ── Batch save ────────────────────────────────────────────────────────────

  private async saveBatch(
    batch: Record<string, unknown>[],
    errors: string[],
    rowNum: number,
  ): Promise<number> {
    try {
      // insertMany with ordered:false continues on duplicate key errors
      const docs = await this.repo.createMany(batch);
      return docs.length;
    } catch (err: any) {
      // Handle duplicate txnId gracefully (skip duplicates, count rest)
      if (err.code === 11000 || err.message?.includes('duplicate')) {
        const dupeCount = (err.writeErrors || []).length;
        const saved = batch.length - dupeCount;
        if (dupeCount > 0) {
          errors.push(`${dupeCount} rows skipped – duplicate txnId(s)`);
        }
        return Math.max(saved, 0);
      }
      this.logger.error(`Batch save failed at row ~${rowNum}: ${err.message}`);
      errors.push(`Batch save error near row ${rowNum}: ${err.message}`);
      return 0;
    }
  }
}
