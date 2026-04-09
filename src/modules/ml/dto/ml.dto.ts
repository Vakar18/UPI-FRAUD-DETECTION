// ─────────────────────────────────────────────────────────────────────────────
// ml.dto.ts
//
// Defines the exact JSON contract between the NestJS backend and the
// Python ML microservice.
//
// MlScoreRequest  → what NestJS sends to POST /predict
// MlScoreResponse → what Python returns
//
// Keeping this in its own file means:
//  • The Python service spec is documented in one place
//  • If the Python API changes, we only update this file + ml.service.ts
// ─────────────────────────────────────────────────────────────────────────────

export interface MlScoreRequest {
  txn_id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;               // in paise (INR × 100)
  hour_of_day: number;          // 0–23
  recent_txn_count: number;     // txns by sender in last 10 min
  is_new_recipient: boolean;
  city: string;
  day_of_week: number;          // 0=Mon … 6=Sun
}

export interface MlScoreResponse {
  txn_id: string;
  risk_score: number;           // 0–100
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  fraud_signals: Record<string, boolean | number>;
  risk_reason: string;
  model_version: string;        // e.g. "isolation-forest-v1.2"
  scored_at: string;            // ISO 8601
}

// Internal result shape used throughout NestJS (camelCase)
export interface ScoringResult {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  fraudSignals: Record<string, boolean | number>;
  riskReason: string;
  modelVersion?: string;
}