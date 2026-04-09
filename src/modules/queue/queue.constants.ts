// queue.constants.ts
// Central place for all queue names and job names.
// Import these everywhere instead of using raw strings.

export const TRANSACTION_QUEUE = 'transaction-processing';
export const SCORE_TRANSACTION_JOB = 'score-transaction';
export const BULK_UPLOAD_JOB = 'bulk-upload';