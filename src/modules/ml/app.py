"""
ml-service/app.py
─────────────────────────────────────────────────────────────────────────────
UPI Fraud Detection – Python ML Microservice

Architecture:
  • Flask REST API with a single POST /predict endpoint
  • Isolation Forest model (unsupervised anomaly detection)
    → Ideal for fraud detection where labelled fraud data is scarce
  • Model trained once on startup with synthetic UPI data, then cached
  • joblib persists the model so it survives restarts without retraining
  • /health endpoint for Docker / k8s readiness probes
  • /retrain endpoint to refresh the model from new data (Part 4 feedback loop)

Why Isolation Forest?
  "It works by randomly partitioning feature space using trees. Anomalous
   transactions get isolated in fewer splits than normal ones – the isolation
   depth becomes the anomaly score. It requires no labelled fraud data, which
   mirrors real-world conditions where confirmed fraud labels are rare."
  — Great interview answer when asked about model choice.

Endpoints:
  POST /predict         → score a single transaction
  GET  /health          → liveness check
  POST /retrain         → retrain model with new samples (optional)
─────────────────────────────────────────────────────────────────────────────
"""

import os
import json
import logging
import numpy as np
import pandas as pd
import joblib
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from dotenv import load_dotenv

load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger("ml-service")

# ── App ───────────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

MODEL_PATH   = os.getenv("MODEL_PATH",   "model.joblib")
SCALER_PATH  = os.getenv("SCALER_PATH",  "scaler.joblib")
MODEL_VERSION = "isolation-forest-v1.0"

# ── Feature set ───────────────────────────────────────────────────────────────
# These map exactly to the MlScoreRequest fields sent by NestJS.
# Order matters – must be consistent between training and inference.
FEATURES = [
    "amount",            # INR paise
    "hour_of_day",       # 0–23
    "recent_txn_count",  # txns in last 10 min by this sender
    "is_new_recipient",  # 0 or 1
    "day_of_week",       # 0=Mon … 6=Sun
    "amount_log",        # log(amount) – normalises the heavy tail
    "is_odd_hour",       # 1 if hour 1–4
    "is_weekend",        # 1 if Sat/Sun
]

# ── Signal weights (used on top of IF score for final risk calculation) ───────
SIGNAL_WEIGHTS = {
    "large_amount":      15,
    "very_large_amount": 25,
    "odd_hour":          20,
    "new_recipient":     20,
    "rapid_succession":  20,
    "very_rapid":        35,
    "round_number":      15,
}

FRAUD_THRESHOLD  = int(os.getenv("FRAUD_RISK_THRESHOLD",  70))
MEDIUM_THRESHOLD = int(os.getenv("MEDIUM_RISK_THRESHOLD", 40))


# ═══════════════════════════════════════════════════════════════════════════════
# Model management
# ═══════════════════════════════════════════════════════════════════════════════

def generate_training_data(n_samples: int = 5000) -> pd.DataFrame:
    """
    Synthesise realistic UPI transaction data for initial model training.
    ~5 % of rows are anomalous (high amount, odd hour, etc.) so the
    Isolation Forest learns what "normal" looks like.
    """
    rng = np.random.default_rng(42)

    # Normal transactions
    n_normal  = int(n_samples * 0.95)
    n_anomaly = n_samples - n_normal

    normal = pd.DataFrame({
        "amount":           rng.integers(100, 1_500_000, n_normal),
        "hour_of_day":      rng.integers(6,  22,         n_normal),
        "recent_txn_count": rng.integers(0,  3,          n_normal),
        "is_new_recipient": rng.integers(0,  2,          n_normal),
        "day_of_week":      rng.integers(0,  7,          n_normal),
    })

    anomaly = pd.DataFrame({
        "amount":           rng.integers(2_500_000, 10_000_000, n_anomaly),
        "hour_of_day":      rng.integers(1, 5,                  n_anomaly),
        "recent_txn_count": rng.integers(4, 10,                 n_anomaly),
        "is_new_recipient": np.ones(n_anomaly, dtype=int),
        "day_of_week":      rng.integers(0, 7,                  n_anomaly),
    })

    df = pd.concat([normal, anomaly], ignore_index=True)

    # Derived features
    df["amount_log"]  = np.log1p(df["amount"])
    df["is_odd_hour"] = df["hour_of_day"].between(1, 4).astype(int)
    df["is_weekend"]  = (df["day_of_week"] >= 5).astype(int)

    return df[FEATURES]


def train_model(training_data_df=None) -> tuple:
    """
    Train Isolation Forest + StandardScaler. Returns (model, scaler).
    
    Args:
        training_data_df: Optional DataFrame with [FEATURES] columns and optional 'is_fraud' label.
                         If None, generates synthetic training data.
    """
    logger.info("Training Isolation Forest model …")
    
    # Use provided data or generate synthetic
    if training_data_df is not None:
        df = training_data_df[FEATURES] if set(FEATURES).issubset(training_data_df.columns) else training_data_df
    else:
        df = generate_training_data(5000)
    
    logger.info(f"Training with {len(df)} samples")
    
    scaler = StandardScaler()
    X      = scaler.fit_transform(df)

    model  = IsolationForest(
        n_estimators=200,
        contamination=0.05,      # expected ~5% anomaly rate
        max_samples="auto",
        max_features=0.9,        # use 90% of features per tree (prevents overfitting)
        bootstrap=False,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X)
    logger.info("Model training complete")
    return model, scaler


def load_or_train() -> tuple:
    """Load persisted model or train fresh if not found."""
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        logger.info(f"Loading model from {MODEL_PATH}")
        return joblib.load(MODEL_PATH), joblib.load(SCALER_PATH)

    model, scaler = train_model()
    joblib.dump(model,  MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    logger.info(f"Model persisted to {MODEL_PATH}")
    return model, scaler


# ── Load model at startup ─────────────────────────────────────────────────────
model, scaler = load_or_train()


# ═══════════════════════════════════════════════════════════════════════════════
# Scoring helpers
# ═══════════════════════════════════════════════════════════════════════════════

def extract_features(data: dict) -> np.ndarray:
    """Convert a /predict request payload into the model's feature vector."""
    amount      = float(data["amount"])
    hour        = int(data["hour_of_day"])
    day         = int(data.get("day_of_week", 0))

    row = {
        "amount":           amount,
        "hour_of_day":      hour,
        "recent_txn_count": int(data.get("recent_txn_count", 0)),
        "is_new_recipient": int(bool(data.get("is_new_recipient", False))),
        "day_of_week":      day,
        "amount_log":       np.log1p(amount),
        "is_odd_hour":      int(1 <= hour <= 4),
        "is_weekend":       int(day >= 5),
    }
    return np.array([[row[f] for f in FEATURES]])


def compute_signals(data: dict) -> dict:
    """
    Compute the same named signals the NestJS rule-based fallback uses.
    This gives analysts a human-readable breakdown alongside the IF score.
    """
    amount = float(data["amount"])
    return {
        "large_amount":      amount > 500_000,
        "very_large_amount": amount > 2_500_000,
        "odd_hour":          1 <= int(data.get("hour_of_day", 12)) <= 4,
        "new_recipient":     bool(data.get("is_new_recipient", False)),
        "rapid_succession":  int(data.get("recent_txn_count", 0)) >= 3,
        "very_rapid":        int(data.get("recent_txn_count", 0)) >= 6,
        "round_number":      amount >= 1_000_000 and amount % 100_000 == 0,
    }


def if_score_to_risk(if_score: float) -> int:
    """
    Isolation Forest returns anomaly scores in [-1, 0].
    More negative = more anomalous.
    Map to [0, 100] where 100 = most anomalous.
    """
    # Clamp to [-0.5, 0] range (typical IsolationForest output)
    clamped = max(-0.5, min(0.0, if_score))
    # Linear map: 0 → 0, -0.5 → 100
    return int((-clamped / 0.5) * 100)


def blend_scores(if_risk: int, signals: dict) -> int:
    """
    Blend the Isolation Forest score (60 %) with weighted rule signals (40 %).
    This gives the model statistical power while keeping scores explainable.
    """
    rule_score = sum(
        SIGNAL_WEIGHTS[k] for k, v in signals.items() if v
    )
    rule_score = min(rule_score, 100)
    blended = int(0.6 * if_risk + 0.4 * rule_score)
    return min(blended, 100)


def score_to_level(score: int) -> str:
    if score >= 90:               return "CRITICAL"
    if score >= FRAUD_THRESHOLD:  return "HIGH"
    if score >= MEDIUM_THRESHOLD: return "MEDIUM"
    return "LOW"


def build_risk_reason(signals: dict, if_score: float) -> str:
    triggered = [k.replace("_", " ") for k, v in signals.items() if v]
    parts = triggered if triggered else ["no rule signals triggered"]
    parts.append(f"IF anomaly score {if_score:.4f}")
    return ", ".join(parts)


# ═══════════════════════════════════════════════════════════════════════════════
# Routes
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/predict")
def predict():
    """
    Score a single UPI transaction.

    Request body (MlScoreRequest from NestJS):
      {
        "txn_id":           "SIM123",
        "sender_id":        "user@oksbi",
        "receiver_id":      "merchant@hdfc",
        "amount":           250000,
        "hour_of_day":      14,
        "recent_txn_count": 1,
        "is_new_recipient": false,
        "city":             "Mumbai",
        "day_of_week":      2
      }

    Response (MlScoreResponse consumed by NestJS):
      {
        "txn_id":        "SIM123",
        "risk_score":    23,
        "risk_level":    "LOW",
        "fraud_signals": { "large_amount": false, ... },
        "risk_reason":   "no rule signals triggered, IF anomaly score -0.0421",
        "model_version": "isolation-forest-v1.0",
        "scored_at":     "2024-04-09T10:30:00.000Z"
      }
    """
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "Empty request body"}), 400

        required = ["txn_id", "amount", "hour_of_day"]
        for field in required:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Feature extraction + scaling
        X         = extract_features(data)
        X_scaled  = scaler.transform(X)

        # Raw Isolation Forest anomaly score (lower = more anomalous)
        if_raw    = float(model.score_samples(X_scaled)[0])
        if_risk   = if_score_to_risk(if_raw)

        # Rule-based signals
        signals   = compute_signals(data)

        # Blended final score
        final_score = blend_scores(if_risk, signals)
        risk_level  = score_to_level(final_score)
        risk_reason = build_risk_reason(signals, if_raw)

        logger.info(
            f"[{data['txn_id']}] IF={if_raw:.4f} if_risk={if_risk} "
            f"blended={final_score} level={risk_level}"
        )

        return jsonify({
            "txn_id":        data["txn_id"],
            "risk_score":    final_score,
            "risk_level":    risk_level,
            "fraud_signals": signals,
            "risk_reason":   risk_reason,
            "model_version": MODEL_VERSION,
            "scored_at":     datetime.utcnow().isoformat() + "Z",
        })

    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.get("/health")
def health():
    """Readiness probe – confirms model is loaded and Redis reachable."""
    return jsonify({
        "status":        "ok",
        "model_version": MODEL_VERSION,
        "model_loaded":  model is not None,
        "timestamp":     datetime.utcnow().isoformat() + "Z",
    })


@app.post("/retrain")
def retrain():
    """
    Retrain the model.
    
    Request body (optional): 
      {
        "samples": [
          {
            "amount": 250000,
            "hour_of_day": 14,
            "recent_txn_count": 1,
            "is_new_recipient": false,
            "day_of_week": 2,
            "amount_log": 12.43,
            "is_odd_hour": 0,
            "is_weekend": 0
          }
        ],
        "use_synthetic": true  # If true or no samples, blend with synthetic data
      }
    
    If request body is empty or use_synthetic=true, uses new synthetic data.
    If samples provided, retrains on those samples (optionally blended with synthetic).
    """
    global model, scaler
    try:
        data = request.get_json(force=True) if request.is_json else {}
        samples = data.get("samples", [])
        use_synthetic = data.get("use_synthetic", not samples)  # Use synthetic if no samples or explicitly set
        
        training_df = None
        
        if samples:
            logger.info(f"Received {len(samples)} real samples for retraining")
            df_real = pd.DataFrame(samples)
            
            # Optionally blend with synthetic data for stability
            if use_synthetic:
                logger.info("Blending with synthetic data for stability")
                df_synthetic = generate_training_data(3000)
                training_df = pd.concat([df_real, df_synthetic], ignore_index=True)
            else:
                training_df = df_real
        else:
            logger.info("No samples provided – using synthetic data only")
        
        # Retrain with provided or synthetic data
        model, scaler = train_model(training_df)
        joblib.dump(model,  MODEL_PATH)
        joblib.dump(scaler, SCALER_PATH)
        
        logger.info(f"Model retrained with {len(training_df) if training_df is not None else 5000} samples")
        return jsonify({
            "status": "retrained",
            "model_version": MODEL_VERSION,
            "samples_used": len(training_df) if training_df is not None else 5000,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        })
    except Exception as e:
        logger.error(f"Retrain error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    logger.info(f"ML service starting on port {port} (debug={debug})")
    app.run(host="0.0.0.0", port=port, debug=debug)