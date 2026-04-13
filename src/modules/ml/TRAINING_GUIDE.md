# Isolation Forest Model Training Guide

## Overview

This guide explains how to train your Isolation Forest model to achieve **better accuracy** for fraud detection in UPI transactions.

## Current State

- **Model**: Isolation Forest (scikit-learn)
- **Training Data**: Synthetic data (5000 samples, 95% normal, 5% fraud)
- **Features**: 8 engineered features (amount, hour, recipient history, etc.)
- **Blending**: 60% ML score + 40% rule-based signals

**The Problem**: Synthetic data may not capture real fraud patterns. For better accuracy, use **real reviewed transactions**.

---

## Quick Start: Train with Real Data

### 1. Prepare MongoDB Data

Ensure your MongoDB has transactions with analyst reviews:

```bash
# Check MongoDB has labeled data
mongosh
> db.transactions.find({ "analyzedBy": { $exists: true } }).count()
```

### 2. Install Dependencies

```bash
cd src/modules/ml
pip install -r requirements.txt
```

### 3. Train the Model

```bash
# Use real transaction data from MongoDB
python train.py --data-source mongodb

# Or use synthetic data (fallback if no MongoDB data)
python train.py --data-source synthetic

# Or use a CSV file
python train.py --data-source csv --csv-path ./transactions.csv
```

### 4. Output

Training creates three files:

```
model.joblib          # Trained Isolation Forest model
scaler.joblib         # StandardScaler for feature normalization
model_metadata.json   # Training metrics and parameters
roc_curve.png         # ROC curve visualization
```

---

## Training Options

### Basic Training (Recommended for Production)

```bash
python train.py --data-source mongodb
```

- Uses last 90 days of analyst-reviewed transactions
- Trains with fixed proven hyperparameters
- Fast (~30-60 seconds)
- Generates evaluation metrics

### With Hyperparameter Tuning

```bash
python train.py --data-source mongodb --hyperparameter-tune
```

- Tests 20 combinations of hyperparameters
- Takes longer (~5-10 minutes)
- May improve accuracy by 2-5%
- Use when adding significant new training data

### CSV Training

```bash
python train.py --data-source csv --csv-path ./my-transactions.csv
```

**CSV Format Required:**

```csv
amount,hour_of_day,recent_txn_count,is_new_recipient,day_of_week,is_fraud
250000,14,1,0,2,0
2500000,2,6,1,3,1
500000,10,0,0,4,0
```

---

## Understanding the Metrics

After training, check `model_metadata.json`:

```json
{
  "metrics": {
    "precision": 0.87,          // Of fraud alerts, 87% are true fraud
    "recall": 0.75,             // Of actual fraud, we catch 75%
    "f1_score": 0.80,          // Harmonic mean of precision/recall
    "roc_auc": 0.91,           // Area under ROC curve (closer to 1 is better)
    "accuracy": 0.96           // Overall correctness
  }
}
```

**What to Look For:**

| Metric | Good Range | What It Means |
|--------|-----------|---------------|
| Precision | 0.80+ | Fewer false alarms (fewer legit txns blocked) |
| Recall | 0.70+ | Catching more actual fraud |
| F1-Score | 0.75+ | Good balance of both |
| ROC-AUC | 0.85+ | Model distinguishes fraud vs normal well |

---

## Best Practices for Accuracy

### 1. Use Real Data

When available, real data beats synthetic data.

```bash
# Synthetic: ~70% accuracy
python train.py --data-source synthetic

# Real: ~85-92% accuracy (if you have good labels)
python train.py --data-source mongodb
```

### 2. Ensure Quality Labels

Before training, ensure analysts have reviewed transactions:

- Mark HIGH/CRITICAL = fraud
- Mark LOW/MEDIUM = legitimate
- Remove uncertain transactions

### 3. Balance Your Data

The training script handles imbalance, but ideal is:

- 90-95% legitimate transactions
- 5-10% fraud transactions

If your data is very skewed, it may need special handling.

### 4. Retrain Periodically

**Recommended Schedule:**

- **Weekly**: After 100+ new analyst reviews
- **Bi-weekly**: As baseline
- **Monthly**: Comprehensive tuning run
- **After campaign**: Major fraud patterns detected

```bash
# Set up a cron job (Linux/Mac)
0 2 * * 0 cd /path/to/ml && python train.py --data-source mongodb > train.log 2>&1
```

### 5. Monitor Model Drift

Track metrics over time:

```bash
# Compare old vs new metrics
diff <(jq '.metrics' old_metadata.json) <(jq '.metrics' new_metadata.json)
```

If precision drops >10%, investigate what changed in fraud patterns.

---

## Tuning for Your Use Case

### If Too Many False Alarms (Low Precision)

Increase the contamination parameter:

```python
# In train.py, adjust:
"contamination": [0.02, 0.03, 0.04, 0.05, 0.06],
# Higher = marks fewer transactions as fraud
```

Then retrain with tuning:

```bash
python train.py --data-source mongodb --hyperparameter-tune
```

### If Missing Real Fraud (Low Recall)

Decrease the contamination parameter:

```python
# In train.py, adjust:
"contamination": [0.03, 0.04, 0.05, 0.06, 0.08, 0.10],
# Lower = more aggressive fraud detection
```

### If Training is Slow

Use fewer cross-validation folds:

```python
# In evaluate_model(), change:
cv=3  # instead of cv=5
```

---

## Feature Engineering Tips

The 8 features used are:

```
1. amount             → Transaction amount (INR)
2. hour_of_day        → 0-23 (12=noon)
3. recent_txn_count   → Txns by sender in last 10 min
4. is_new_recipient   → 0 or 1 (binary)
5. day_of_week        → 0=Monday, 6=Sunday
6. amount_log         → log(amount) - captures magnitude better
7. is_odd_hour        → 1 if 1-4 AM (high fraud time)
8. is_weekend         → 1 if Saturday/Sunday
```

To add more features:

1. Add to `FEATURES` list in both `train.py` and `app.py`
2. Compute in `prepare_features()` and `extract_features()`
3. Retrain the model

Example: Add "user_age_days" (how long user account exists):

```python
FEATURES = [
    # ... existing 8 ...
    "user_age_days",
]

# In prepare_features()
df["user_age_days"] = (datetime.now() - df["account_created"]).dt.days
```

---

## Deployment Workflow

### 1. Train Locally/In Container

```bash
docker build -t fraud-ml -f src/modules/ml/Dockerfile .
docker run -e MONGO_URI=mongodb://mongo:27017 fraud-ml python train.py
```

### 2. Replace Model in Service

```bash
# Copy trained model to container volume
docker cp model.joblib fraud-ml-container:/app/model.joblib
docker cp scaler.joblib fraud-ml-container:/app/scaler.joblib
```

### 3. Restart Service

```bash
docker restart fraud-ml
# Service loads new model on restart
```

### 4. Verify

```bash
curl http://localhost:5000/health
# Should show new model_version if you bumped it
```

---

## Troubleshooting

### "No reviewed transactions found"

**Problem**: MongoDB has no `analyzedBy` field.

**Solution**: Ensure analysts are reviewing transactions and setting this field:

```javascript
db.transactions.updateOne(
  { txnId: "TXN123" },
  { $set: { analyzedBy: "analyst@company.com", riskLevel: "HIGH" } }
)
```

### "Low recall on test data"

**Problem**: Model missing real fraud.

**Solution**:
1. Check if fraud data is representative
2. Increase `contamination` parameter
3. Add more fraud examples to training set
4. Retrain with hyperparameter tuning

### "Model accuracy dropped after retraining"

**Problem**: Drift in fraud patterns.

**Solution**:
1. Check if new fraud patterns emerged
2. Consider weighting recent data higher
3. Review new analyst labels for errors
4. Retrain more frequently

### "Training takes too long"

**Problem**: Large dataset.

**Solution**:
1. Reduce `max_samples` in Isolation Forest
2. Use fewer CV folds
3. Skip hyperparameter tuning
4. Sample data: `df.sample(frac=0.8)`

---

## Production Monitoring

After deployment, monitor in production:

### 1. Track Prediction Distribution

```python
# In ml.service.ts or app.py
log_metric("fraud_score", risk_score)
log_metric("risk_level", risk_level)
```

### 2. Compare Predictions vs Analyst Labels

Monthly compare model predictions to analyst reviews.

### 3. Alert on Model Drift

If HIGH/CRITICAL prediction rate changes >30%, investigate.

### 4. A/B Test New Models

Train new model → compare metrics → gradually roll out.

---

## Advanced: Custom Training Script

For integration with your system, adapt the train script:

```python
from train import train_pipeline

# Train with custom settings
train_pipeline(
    data_source="mongodb",
    test_size=0.2,
    hyperparameter_tune=False,
    save_plots=True,
)
```

Then use trained model in your service without restart.

---

## Summary

| Step | Command | Time |
|------|---------|------|
| Install deps | `pip install -r requirements.txt` | 2 min |
| Train (basic) | `python train.py --data-source mongodb` | 1 min |
| Train (tuned) | `python train.py --data-source mongodb --hyperparameter-tune` | 10 min |
| Evaluate | Check `model_metadata.json` | Instant |
| Deploy | Copy model/scaler to service | 1 min |

**Next Steps**:

1. ✅ Install dependencies: `pip install -r requirements.txt`
2. ✅ Run first training: `python train.py --data-source synthetic`
3. ✅ Verify model works: Check output files
4. ✅ Integrate with MongoDB when data available
5. ✅ Set up weekly retraining cron job

---

## Questions?

Refer to:
- [scikit-learn Isolation Forest](https://scikit-learn.org/stable/modules/ensemble.html#isolation-forest)
- `train.py` for implementation details
- `app.py` for model inference code
