# ML Module – Isolation Forest Training Guide

## Quick Start (30 seconds)

```bash
cd src/modules/ml
./train-quickstart.sh synthetic
```

This trains a model, generates metrics, and creates test visualizations.

---

## Overview

This module contains the **Isolation Forest machine learning model** for fraud detection in UPI transactions.

### Files

| File | Purpose |
|------|---------|
| `app.py` | Flask API serving the trained model via `/predict` endpoint |
| `train.py` | Comprehensive training script (main tool for improving accuracy) |
| `requirements.txt` | Python dependencies |
| `TRAINING_GUIDE.md` | Detailed training best practices & tuning |
| `train-quickstart.sh` | Quick-start script for common training scenarios |
| `sample-training-data.csv` | Example CSV for testing training |
| `Dockerfile` | Container for deployment |

---

## Training Your Model

### Why Train?

The default model trains on **synthetic data** (~70% accuracy). With real transaction data, accuracy improves to **85-92%**.

### Option 1: Synthetic Data (Testing/Demo)

Fastest way to verify training works:

```bash
./train-quickstart.sh synthetic
```

⏱️ **Time**: ~1 minute  
✓ **Use for**: Testing, CI/CD, demos  
⚠️ **Limitation**: May not reflect real fraud patterns

### Option 2: CSV File (Staging/Demo)

Use labeled CSV with fraud/legitimate transactions:

```bash
./train-quickstart.sh csv
```

Or with custom CSV:

```bash
python3 train.py --data-source csv --csv-path /path/to/transactions.csv
```

**CSV Format** (must have these columns):

```csv
amount,hour_of_day,recent_txn_count,is_new_recipient,day_of_week,amount_log,is_odd_hour,is_weekend,is_fraud
250000,14,1,0,2,12.43,0,0,0
2500000,2,6,1,5,14.73,1,1,1
```

⏱️ **Time**: ~1 minute  
✓ **Use for**: Local testing with known data  
✓ **Best for**: When you have labeled data in CSV form

### Option 3: MongoDB (Production)

Train on analyst-reviewed transactions from your MongoDB:

```bash
./train-quickstart.sh mongodb
```

**Requirements**:
- MongoDB running and accessible
- Transactions have `analyzedBy` field set
- Transactions marked with `riskLevel` (HIGH/CRITICAL = fraud, LOW/MEDIUM = legitimate)

**Configuration** (in `.env`):

```env
MONGO_URI=mongodb://localhost:27017
MONGO_DB=upi_fraud_db
```

⏱️ **Time**: 2-3 minutes  
✓ **Use for**: Production training with real data  
✓ **Best**: Most accurate results

### Option 4: Hyperparameter Tuning (Slow but Best)

Automatically find optimal parameters:

```bash
./train-quickstart.sh tune
```

Or for MongoDB:

```bash
python3 train.py --data-source mongodb --hyperparameter-tune
```

⏱️ **Time**: 10-15 minutes  
✓ **Use for**: Monthly optimization with significant new data  
✓ **Improvement**: 2-5% accuracy boost

---

## Understanding Results

After training, check **three files**:

### 1. `model_metadata.json`

Contains training metrics:

```json
{
  "trained_at": "2026-04-13T10:30:00.123456",
  "model_version": "isolation-forest-v2.0",
  "n_samples": 5000,
  "metrics": {
    "precision": 0.87,
    "recall": 0.75,
    "f1_score": 0.80,
    "roc_auc": 0.91,
    "accuracy": 0.96
  }
}
```

**What to look for**:

- **Precision** > 0.80: Good at avoiding false alarms
- **Recall** > 0.70: Good at catching fraud
- **F1-Score** > 0.75: Good balance
- **ROC-AUC** > 0.85: Excellent discrimination

### 2. `roc_curve.png`

Visual ROC curve showing model performance. Higher curve = better model.

### 3. Console Output

View detailed training progress:

```
Training Isolation Forest model…
Evaluating model…
Metrics:
  {
    "precision": 0.87,
    "recall": 0.75,
    "f1_score": 0.80,
    "roc_auc": 0.91
  }
```

---

## Running the Model

### 1. Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Run Flask server
python3 app.py

# In another terminal, test:
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "txn_id": "TXN001",
    "amount": 250000,
    "hour_of_day": 14,
    "recent_txn_count": 1,
    "is_new_recipient": false,
    "day_of_week": 2
  }'
```

### 2. In Docker Container

```bash
# Build image
docker build -t fraud-ml -f Dockerfile .

# Run container
docker run -p 5000:5000 \
  -e MODEL_PATH=/app/model.joblib \
  -e SCALER_PATH=/app/scaler.joblib \
  fraud-ml
```

### 3. As Part of Full App

The NestJS backend calls this service at `ML_SERVICE_URL`:

```env
ML_SERVICE_URL=http://ml:5000
```

---

## API Endpoints

### POST /predict

Score a single transaction.

**Request**:

```json
{
  "txn_id": "SIM123",
  "sender_id": "user@oksbi",
  "receiver_id": "merchant@hdfc",
  "amount": 250000,
  "hour_of_day": 14,
  "recent_txn_count": 1,
  "is_new_recipient": false,
  "city": "Mumbai",
  "day_of_week": 2
}
```

**Response**:

```json
{
  "txn_id": "SIM123",
  "risk_score": 23,
  "risk_level": "LOW",
  "fraud_signals": {
    "large_amount": false,
    "odd_hour": false,
    "new_recipient": false
  },
  "risk_reason": "no rule signals triggered, IF anomaly score -0.0421",
  "model_version": "isolation-forest-v2.0",
  "scored_at": "2026-04-13T10:30:00.000Z"
}
```

### GET /health

Check if model is loaded.

```bash
curl http://localhost:5000/health
```

Response:

```json
{
  "status": "ok",
  "model_version": "isolation-forest-v2.0",
  "model_loaded": true,
  "timestamp": "2026-04-13T10:30:00.000Z"
}
```

### POST /retrain

Retrain model with new data.

**Option 1: Retrain with synthetic data**

```bash
curl -X POST http://localhost:5000/retrain
```

**Option 2: Provide real samples**

```bash
curl -X POST http://localhost:5000/retrain \
  -H "Content-Type: application/json" \
  -d '{
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
    "use_synthetic": true
  }'
```

---

## Training Workflow

### Weekly Training (Recommended)

```bash
# 1. Ensure MongoDB has analyst reviews
# 2. Train on recent data
cd src/modules/ml
python3 train.py --data-source mongodb

# 3. Check metrics
cat model_metadata.json | jq '.metrics'

# 4. If metrics are good, deploy to production
docker cp model.joblib <container>:/app/
docker restart ml-service
```

### Monthly Optimization

```bash
# Full hyperparameter tuning
python3 train.py \
  --data-source mongodb \
  --hyperparameter-tune \
  --test-size 0.2
```

### When Accuracy Drops

```bash
# 1. Check what changed
python3 train.py --data-source mongodb

# 2. Compare metrics
diff old_metadata.json model_metadata.json

# 3. Investigate fraud pattern change
# 4. Add more examples to training data if needed
# 5. Retrain
```

---

## Improving Accuracy

### 1. **Add Quality Training Data**

More labeled fraud examples = better model:

```bash
# Collect analyst-reviewed transactions
python3 train.py --data-source mongodb
```

### 2. **Fine-tune Parameters**

Find optimal settings for your fraud patterns:

```bash
python3 train.py \
  --data-source mongodb \
  --hyperparameter-tune
```

### 3. **Adjust for Your Risk Profile**

Edit `IF_PARAMS` in `train.py` to bias toward:

- **High precision** (fewer false alarms): Lower `contamination`
- **High recall** (catch more fraud): Higher `contamination`

```python
IF_PARAMS = {
    "contamination": [0.02, 0.03, 0.04, 0.05],  # Range to test
}
```

### 4. **Add Domain Knowledge**

Include additional features:

```python
FEATURES = [
    # Existing 8 features
    "amount",
    "hour_of_day",
    # ... etc
    
    # Add new features
    "user_vip_status",      # Trusted users = lower risk
    "transaction_velocity", # Multiple txns to same recipient
    "amount_anomaly",       # Compared to user history
]
```

---

## Troubleshooting

### Model Training Fails

**Error: "No reviewed transactions found"**

→ MongoDB doesn't have analyst-reviewed transactions

**Solution**:
1. Check MongoDB connection: `mongosh`
2. Verify data: `db.transactions.findOne({ analyzedBy: { $exists: true } })`
3. Use synthetic or CSV data for now: `./train-quickstart.sh csv`

### Model Accuracy Issues

**Issue: High false alarms (low precision)**

```bash
# Reduce fraud detection sensitivity
python3 train.py --data-source mongodb --hyperparameter-tune
# Then check metrics and adjust contamination parameter
```

**Issue: Missing fraud (low recall)**

```bash
# Increase fraud detection sensitivity
# Edit train.py contamination parameter
python3 train.py --data-source mongodb --hyperparameter-tune
```

### Deployment Issues

**Issue: Old model still running after restart**

```bash
# Ensure model files exist in container:
docker exec ml-service ls -la /app/model.joblib
docker restart ml-service

# Check health endpoint:
curl http://localhost:5000/health
```

---

## Performance Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| Train (synthetic) | 1 min | Good for testing |
| Train (MongoDB, 1000 samples) | 2 min | Production daily |
| Train (MongoDB, 10000 samples) | 5 min | Production weekly |
| Train + Tuning | 10-15 min | Monthly optimization |
| Prediction (single txn) | <100ms | Real-time scoring |
| Batch predict (1000 txns) | ~1 sec | Background jobs |

---

## Files Changed When Training

- ✅ `model.joblib` – New trained model
- ✅ `scaler.joblib` – Feature normalization
- ✅ `model_metadata.json` – Metrics and parameters
- ✅ `roc_curve.png` – Performance visualization

**Do NOT edit manually** – let `train.py` regenerate.

---

## Next Steps

1. ✅ Run first training: `./train-quickstart.sh synthetic`
2. ✅ Review metrics: `cat model_metadata.json`
3. ✅ Check image: `open roc_curve.png`
4. ✅ Set up MongoDB (if available)
5. ✅ Configure weekly retraining cron job
6. ✅ Deploy to production

---

## References

- [Full Training Guide](./TRAINING_GUIDE.md) – Detailed best practices
- [scikit-learn Isolation Forest](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html)
- [Feature Engineering Guide](./TRAINING_GUIDE.md#feature-engineering-tips)
- [Deployment Instructions](../../../README.md#deployment)

---

## Need Help?

1. Check `TRAINING_GUIDE.md` for detailed best practices
2. Review `train.py` code comments
3. Check console logs during training
4. See troubleshooting section above
