# Complete Deployment Architecture - Visual Guide

After ML service deployment, here's your complete system:

---

## 🏗️ Full System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         YOUR USERS / CLIENTS                        │
└────────────┬──────────────────────────────────────────────────────┬─┘
             │                                                      │
             │ HTTP + WebSocket                        REST API
             │                                              │
    ┌────────▼──────────────┐                      ┌────────▼────────────┐
    │   FRONTEND (Vercel)   │                      │  THIRD-PARTY APPS   │
    │  - React Dashboard    │                      │   (Your partners)   │
    │  - Real-time alerts   │                      │  Can integrate too! │
    │  - Transactions list  │                      └────────┬────────────┘
    │  - Stats display      │                               │
    └────────┬──────────────┘                               │
             │                                              │
             └──────────────────┬───────────────────────────┘
                                │
                    HTTP + WebSocket
                                │
    ┌───────────────────────────▼──────────────────────────┐
    │          NESTJS BACKEND (Railway)                    │
    │  - Transaction API (/api/v1/transactions)            │
    │  - WebSocket Gateway (fraud-alert, txn-scored)       │
    │  - Health checks (/api/v1/health)                    │
    │  - Swagger docs (/api/v1/docs)                       │
    │  - Rate limiting & throttling                        │
    │  - CORS enabled for frontend domains                 │
    └───────────────────────────┬──────────────────────────┘
                    │                   │
        ┌───────────┼───────────┬───────┴─────────┐
        │           │           │                 │
        ▼           ▼           ▼                 ▼
    ┌────────┐  ┌────────┐  ┌────────┐      ┌──────────┐
    │MongoDB │  │ Redis  │  │  ML    │      │  Queue   │
    │ Atlas  │  │Service │  │Service │      │BullMQ    │
    │ (Cloud)│  │Railway │  │Railway │      │Redis     │
    └────────┘  └────┬───┘  └───┬────┘      └──────────┘
   "Database"       │           │              "Jobs"
   "512MB Free"     │    ┌──────▼────────┐
                    │    │Flask + Python │
                    │    │- Predictions  │
   Public/CRUD ─────┤    │- Model cache  │
   Transactions     │    │- ML endpoints │
                    │    └────────────────┘
   Sessions/Cache ──┘    "Fraud Scoring"
   Job Queue         "Python ML Service"
   pub/sub
```

---

## 📊 Deployment Status After Following This Guide

### ✅ Deployed Services

| Service | Platform | Status | Free? |
|---------|----------|--------|-------|
| **NestJS Backend** | Railway | ✅ Running | Yes |
| **MongoDB** | Atlas | ✅ Running | Yes |
| **Redis** | Railway | ✅ Running | Yes |
| **ML Service** | Railway | 🔲 You're here | Yes |
| **Frontend** | Vercel | 📋 Next step | Yes |

---

## 🔄 How Data Flows (Step by Step)

### When frontend user submits a transaction:

```
1. Frontend clicks "Submit Transaction"
   ├─ Sends HTTP POST to: https://backend.railway.app/api/v1/transactions
   └─ Body: { amount, senderId, recipientId, paymentMethod }

2. Backend NestJS app receives request
   ├─ Validates the data
   ├─ Saves to MongoDB
   └─ Adds to BullMQ queue (Redis)

3. Transaction Processor picks it up
   ├─ Calculates rule-based score
   ├─ Makes HTTP call to ML Service
   │  └─ URL: https://ml-service.railway.app/predict
   │     Body: { amount, senderId, recipientId, ... }
   └─ ML Service returns: { fraud_probability: 0.45, risk_score: 45 }

4. Backend combines scores
   ├─ Updates MongoDB with results
   ├─ Publishes via Redis pub/sub
   └─ WebSocket Gateway broadcasts to connected clients

5. Frontend receives real-time updates
   ├─ WebSocket event 'txn-scored' with complete data
   ├─ Updates transaction table
   ├─ If high risk → shows fraud-alert event with warning
   └─ Updates dashboard stats

6. Complete! One full cycle in ~500ms
```

---

## 🚀 Current Setup - What's Running Where

### Backend System (Railway)
```
Primary Container: NestJS API
├─ Language: TypeScript/Node.js
├─ Framework: NestJS v10
├─ Port: 3000 (auto-assigned by Railway)
└─ Environment: Production mode

Connected Services:
├─ MongoDB Atlas (Cloud database)
│  └─ String: mongodb+srv://username:password@cluster.mongodb.net/db
│
├─ Redis (Cache & Message Broker)
│  └─ Host: redis.railway.internal:6379
│
└─ ML Service (Fraud scoring)
   └─ URL: https://your-ml-service.railway.app
```

### ML System (Railway - NEW)
```
Service: Python Flask App
├─ Language: Python 3.12
├─ Framework: Flask 3.0.3
├─ ML Library: scikit-learn (Isolation Forest)
├─ Port: 5000
├─ Process Manager: Gunicorn (4 workers)
│
├─ Endpoints:
│  ├─ GET /health → liveness check
│  ├─ POST /predict → fraud scoring
│  └─ POST /retrain → model retraining
│
└─ Model:
   ├─ Algorithm: Isolation Forest (unsupervised)
   ├─ Training: On startup with synthetic data
   └─ Persistence: joblib files in /app/models
```

---

## 📋 Configuration Files Needed

### Files Already in Your Project

```
✅ src/modules/ml/app.py              - Flask application
✅ src/modules/ml/requirements.txt    - Python dependencies
✅ src/modules/ml/Dockerfile          - Container image
✅ Procfile                            - Railway deployment config (JUST ADDED)
✅ runtime.txt                         - Python version (JUST ADDED)
✅ docker-compose.yml                 - Local dev setup
✅ package.json                        - Node dependencies
✅ .env                                - Configuration
```

### What to Update Next
```
.env
├─ ML_SERVICE_URL=https://your-ml-service.railway.app  ← CHANGE THIS
├─ MONGODB_URI=mongodb+srv://...                        ← Already set
├─ REDIS_HOST=redis.railway.internal                    ← Already set
└─ CORS_ORIGIN=https://your-frontend.vercel.app       ← When deploying frontend
```

---

## 🎯 Environment Variables by Service

### Backend (.env & Railway Variables)
```
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://admin:pass@cluster.mongodb.net/db
MONGODB_DB_NAME=upi_fraud_detection
REDIS_HOST=redis.railway.internal
REDIS_PORT=6379
ML_SERVICE_URL=https://your-ml-service.railway.app  ← UPDATE THIS
ML_SERVICE_TIMEOUT=5000
FRAUD_RISK_THRESHOLD=70
MEDIUM_RISK_THRESHOLD=40
CORS_ORIGIN=https://your-frontend.vercel.app
SIMULATOR_ENABLED=false
```

### ML Service (Railway Variables Only)
```
PORT=5000
FLASK_ENV=production
FRAUD_RISK_THRESHOLD=70
MEDIUM_RISK_THRESHOLD=40
```

### Frontend (.env)
```
REACT_APP_API_URL=https://your-backend.railway.app
REACT_APP_WS_URL=wss://your-backend.railway.app
```

---

## 📊 Typical Request/Response Cycle

### Request from Frontend
```json
POST /api/v1/transactions
{
  "amount": 50000,
  "senderId": "user_123",
  "recipientId": "user_456",
  "paymentMethod": "UPI",
  "timestamp": "2024-04-14T10:30:00Z",
  "deviceId": "device_789"
}
```

### Response from Backend
```json
{
  "_id": "6616a1b2c3d4e5f6g7h8i9j0",
  "amount": 50000,
  "senderId": "user_123",
  "recipientId": "user_456",
  "paymentMethod": "UPI",
  "riskScore": 45,
  "riskLevel": "MEDIUM",
  "fraudProbability": 0.35,
  "flaggedRules": ["new_recipient"],
  "mlScore": {
    "fraud_probability": 0.35,
    "risk_score": 45,
    "model_version": "1.0",
    "prediction_time_ms": 125
  },
  "createdAt": "2024-04-14T10:30:05Z",
  "status": "PROCESSED"
}
```

### WebSocket Events to Frontend
```javascript
// Real-time alert for high-risk transaction
socket.emit('fraud-alert', {
  _id: "6616a1b2c3d4e5f6g7h8i9j0",
  amount: 150000,
  riskScore: 85,
  riskLevel: "HIGH",
  message: "Large amount to new recipient",
  severity: "CRITICAL"
});

// Transaction scoring complete
socket.emit('txn-scored', {
  _id: "6616a1b2c3d4e5f6g7h8i9j0",
  amount: 50000,
  riskScore: 45,
  status: "PROCESSED"
});

// Stats update every 30 seconds
socket.emit('stats-update', {
  totalTransactions: 2547,
  highRiskCount: 89,
  avgRiskScore: 42.5,
  timestamp: "2024-04-14T10:30:00Z"
});
```

---

## 🔗 How ML Service Integrates

### What ML Service Does
```
Input: Transaction features
├─ amount
├─ senderId
├─ recipientId
├─ transactionsCount
├─ isNewRecipient
├─ dayOfWeek
├─ hourOfDay
└─ (potentially more)

Processing:
├─ Load Isolation Forest model
├─ Scale features with StandardScaler
├─ Run through model
└─ Calculate anomaly score

Output: Fraud probability (0-1)
├─ 0.0 = definitely legitimate
├─ 0.5 = uncertain
└─ 1.0 = definitely fraudulent

Final Risk Score: probability × 100 (0-100)
```

### Backend Uses ML Score
```
Step 1: Calculate rule-based score
  • new_recipient: +15 points
  • high_amount: +25 points
  • etc.
  • Initial score: ~40

Step 2: Call ML Service
  • ML returns: 0.35 probability
  • Converted: 35 points

Step 3: Combine
  • (40 + 35) / 2 = 37.5 final score
  • Or weighted: 40*0.6 + 35*0.4 = 38

Status: "LOW" risk (< 40)
```

---

## 🎬 Next Steps After ML Deployment

1. ✅ **ML Service Deployed** (current step)
2. 📋 **Test ML Service** (verify /health endpoint)
3. 🔧 **Update Backend Variables** (ML_SERVICE_URL)
4. 🚀 **Deploy Frontend** (Vercel)
5. 🧪 **End-to-End Test** (submit transaction, see alert)
6. 📊 **Monitor Logs** (Railway dashboard)
7. 🎨 **Customize Dashboard** (add your branding)

---

## 📞 All Your System URLs

After ML deployment, you have:

| Service | URL | Purpose |
|---------|-----|---------|
| **Backend API** | https://your-backend.railway.app | Main API |
| **Swagger Docs** | https://your-backend.railway.app/api/v1/docs | API documentation |
| **Health Check** | https://your-backend.railway.app/api/v1/health | System status |
| **ML Service** | https://your-ml-service.railway.app | Fraud scoring |
| **ML Health** | https://your-ml-service.railway.app/health | ML status |
| **Frontend** | https://your-frontend.vercel.app | Dashboard (next) |

---

## ✅ Deployment Checklist Status

```
Infrastructure Setup:
 ✅ MongoDB Atlas signed up & configured
 ✅ Railway account created
 ✅ GitHub repository connected

Backend Deployment:
 ✅ NestJS app deployed on Railway
 ✅ Database connected (MongoDB Atlas)
 ✅ Redis connected (Railway)
 ✅ Backend running & healthy

ML Service Deployment:
 🔲 Procfile created (DONE)
 🔲 runtime.txt created (DONE)
 🔲 Push to GitHub (DO THIS NEXT)
 🔲 Deploy on Railway (DO THIS NEXT)
 🔲 Update ML_SERVICE_URL (DO THIS NEXT)
 🔲 Test ML Service (DO THIS NEXT)

Frontend Deployment: (Later)
 ❌ Create React app
 ❌ Deploy to Vercel
 ❌ Connect to backend

Final Integration: (Later)
 ❌ Test full system
 ❌ WebSocket connection
 ❌ Real-time alerts
 ❌ Production launch
```

---

## 🎓 Learning Resources

- [ML Service Deployment Guide](./ML_SERVICE_DEPLOYMENT.md) - Full detailed guide
- [Quick Deployment Checklist](./ML_DEPLOYMENT_CHECKLIST.md) - Step-by-step
- [Deployment Index](./DEPLOYMENT_INDEX.md) - All guides
- [Frontend Integration](./FRONTEND_INTEGRATION_GUIDE.md) - API reference

---

**You're almost there! Complete the ML deployment and connect everything. 🚀**
