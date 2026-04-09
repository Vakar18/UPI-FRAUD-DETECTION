// ─────────────────────────────────────────────────────────────────────────────
// queue.constants.ts
//
// Single source of truth for every queue name and job name in the system.
// Import these constants everywhere — never use raw strings for queue/job names.
//
// BullMQ dashboard (Bull Board) uses these names to show queue cards at /queues
// ─────────────────────────────────────────────────────────────────────────────

// Queue names  (one Redis stream per queue)
export const TRANSACTION_QUEUE = 'transaction-processing';
export const BULK_UPLOAD_QUEUE  = 'bulk-upload-processing';

// Job names within TRANSACTION_QUEUE
export const SCORE_TRANSACTION_JOB = 'score-transaction';

// Job names within BULK_UPLOAD_QUEUE
export const PROCESS_BULK_UPLOAD_JOB = 'process-bulk-upload';

// Default BullMQ job options reused across producers
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { count: 500 },   // keep last 500 completed jobs for dashboard
  removeOnFail:     { count: 1000 },  // keep last 1000 failed jobs for inspection
};