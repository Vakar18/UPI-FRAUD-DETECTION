# Free Deployment Guide - UPI Fraud Detection System

Complete guide to deploy this project for free and enable frontend clients to consume live data.

---

## 🎯 Overview: Free Hosting Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React/Vue/etc)                   │
│                   (Hosted: Vercel/Netlify FREE)                │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP + WebSocket
┌────────────────────────────▼────────────────────────────────────┐
│                    NESTJS API BACKEND                            │
│      (Hosted: Railway/Render/Heroku FREE Tier - 1000 hours)     │
│  - Transaction endpoints                                         │
│  - WebSocket for real-time alerts                               │
│  - Swagger API docs                                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
    ┌────────────────────────┼────────────────────────┐
    │                        │                        │
    ▼                        ▼                        ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  MONGODB     │       │   REDIS      │       │  ML SERVICE  │
│ (Atlas FREE) │       │(Railway FREE)│       │(Railway FREE)│
│   512MB      │       │   512MB RAM  │       │   512MB RAM  │
└──────────────┘       └──────────────┘       └──────────────┘
```

---

## Part 1: Free Hosting Services Comparison

| Component | Service | Tier | Features | Limits |
|-----------|---------|------|----------|--------|
| **Backend (NestJS)** | Railway | Free | 5 GB bandwidth/mo | 512 MB RAM |
| | Render | Free (Starter) | Unlimited bandwidth | 0.5 GB RAM, auto-sleep |
| | Fly.io | Free | 3 shared-cpu-1x VM | – |
| **MongoDB** | MongoDB Atlas | Free | Cloud database | 512 MB storage |
| | Vercel Postgres | Free | Relational DB | 4 GB limit |
| **Redis** | Railway | Free | Managed Redis | 512 MB RAM |
| | Upstash | Free | Remote Redis | 10k commands/day (limited) |
| **Python ML** | Railway | Free | Standalone service | 512 MB RAM |
| | Render | Free | Docker support | 0.5 GB RAM, auto-sleep |
| **Frontend** | Vercel | Free | Unlimited | 100 GB bandwidth |
| | Netlify | Free | Unlimited | 100 GB bandwidth |

### **BEST FREE STACK (RECOMMENDED):**
- ✅ **Backend:** Railway or Render  
- ✅ **Database:** MongoDB Atlas (free tier)  
- ✅ **Cache:** Railway Redis or Upstash  
- ✅ **ML Service:** Railway or Render  
- ✅ **Frontend:** Vercel or Netlify  

---

## Part 2: Step-by-Step Deployment Process

### Step 2.1: MongoDB Atlas Setup (FREE Cloud Database)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up (free account)
3. Create a **free tier cluster** (M0 - 512MB)
4. Choose region closest to your users
5. Create a **database user** with username & password
6. Whitelist IP: Set to `0.0.0.0/0` (allow all)
7. Copy **connection string**: 
   ```
   mongodb+srv://username:password@cluster.mongodb.net/upi_fraud_detection
   ```
8. Save this - you'll use it in backend deployment

### Step 2.2: Backend Deployment (Railway)

**Why Railway?** Free tier includes 512 MB RAM, generous bandwidth, persistent storage.

1. Go to [railway.app](https://railway.app)
2. Sign up (GitHub/Google)
3. Create new project → "Deploy from GitHub"
4. Connect your GitHub repo
5. Select this project repo
6. Configure environment variables:
   ```
   NODE_ENV=production
   PORT=3000
   API_PREFIX=api/v1
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/upi_fraud_detection
   MONGODB_DB_NAME=upi_fraud_detection
   REDIS_HOST=[railway-redis-host]
   REDIS_PORT=6379
   REDIS_PASSWORD=[from Redis service]
   ML_SERVICE_URL=https://[your-ml-service-domain]
   ML_SERVICE_TIMEOUT=5000
   FRAUD_RISK_THRESHOLD=70
   MEDIUM_RISK_THRESHOLD=40
   SIMULATOR_ENABLED=false  # Disable simulator in production
   ```

7. Deploy → Railway will auto-build and deploy
8. Get your API URL: `https://your-app.up.railway.app`

**Enable CORS for frontend:**
```typescript
// This is already in app.module.ts, update .env
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

### Step 2.3: Redis Setup (Railway)

1. In Railway dashboard, click "New Service"
2. Select **Redis** from marketplace
3. It auto-links to your project
4. Get connection details from "Variables" tab
5. Add `REDIS_HOST` and `REDIS_PASSWORD` to backend vars

### Step 2.4: Python ML Service Deployment (Railway)

1. In Railway project, add new service
2. Choose "Deploy from GitHub"
3. Point to same repo (ML module auto-detected)
4. Create `Procfile` in root if not exists:
   ```
   web: cd src/modules/ml && python app.py
   ```
5. Railway detects Python, installs dependencies from `requirements.txt`
6. Get ML service URL: `https://ml-service.up.railway.app`
7. Update backend `ML_SERVICE_URL` env var

### Step 2.5: Frontend Deployment (Vercel)

1. Create your React/Vue frontend (or use sample from `public/`)
2. Go to [vercel.com](https://vercel.com)
3. Sign up → Connect GitHub
4. Import repository
5. Set environment variables:
   ```
   REACT_APP_API_URL=https://your-app.up.railway.app
   REACT_APP_WS_URL=wss://your-app.up.railway.app  # WebSocket URL
   ```
6. Deploy → Your frontend is live on `yourapp.vercel.app`

---

## Part 3: Frontend Integration - How to Connect

### 3.1: REST API Endpoints (HTTP)

```javascript
// .env
REACT_APP_API_URL=https://your-app.up.railway.app/api/v1

// Example: Create Transaction
const createTransaction = async (txnData) => {
  const response = await fetch(
    `${process.env.REACT_APP_API_URL}/transactions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(txnData)
    }
  );
  return response.json();
};

// Example: Get all transactions
const getTransactions = async () => {
  const response = await fetch(
    `${process.env.REACT_APP_API_URL}/transactions`
  );
  return response.json();
};
```

### 3.2: Real-Time WebSocket Connection (Live Alerts)

```javascript
import io from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL;
const socket = io(API_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling']
});

// Listen for fraud alerts
socket.on('fraud-alert', (data) => {
  console.log('🚨 FRAUD DETECTED:', data);
  // Update UI with alert
});

// Listen for transaction scoring
socket.on('txn-scored', (data) => {
  console.log('📊 Transaction Scored:', data);
});

// Listen for stats updates
socket.on('stats-update', (data) => {
  console.log('📈 Stats Updated:', data);
});
```

### 3.3: Complete React Component Example

```jsx
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

export default function FraudDashboard() {
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect WebSocket
    const newSocket = io(process.env.REACT_APP_API_URL);
    setSocket(newSocket);

    // Fetch initial transactions
    fetch(`${process.env.REACT_APP_API_URL}/transactions`)
      .then(res => res.json())
      .then(data => setTransactions(data));

    // Real-time events
    newSocket.on('fraud-alert', (data) => {
      setAlerts(prev => [data, ...prev]);
    });

    return () => newSocket.close();
  }, []);

  const submitTransaction = async (txnData) => {
    const res = await fetch(
      `${process.env.REACT_APP_API_URL}/transactions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txnData)
      }
    );
    const result = await res.json();
    setTransactions(prev => [result, ...prev]);
  };

  return (
    <div>
      <h1>Fraud Detection Dashboard</h1>
      <div>
        <h2>Recent Transactions ({transactions.length})</h2>
        {transactions.map(txn => (
          <div key={txn._id} style={{ 
            padding: '10px', 
            marginBottom: '5px',
            backgroundColor: txn.riskScore > 70 ? '#ffebee' : '#f5f5f5'
          }}>
            <p><strong>{txn.amount}</strong> → {txn.recipientId}</p>
            <p>Risk Score: {txn.riskScore}</p>
          </div>
        ))}
      </div>
      <div>
        <h2>⚠️ Fraud Alerts ({alerts.length})</h2>
        {alerts.map(alert => (
          <div key={alert._id} style={{ padding: '10px', backgroundColor: '#ffcdd2' }}>
            <p>🚨 {alert.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Part 4: API Reference for Frontend

### POST /api/v1/transactions
Create and score a transaction

```bash
curl -X POST https://your-api.up.railway.app/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "senderId": "user123",
    "recipientId": "user456",
    "timestamp": "2024-04-14T10:30:00Z",
    "paymentMethod": "UPI",
    "deviceId": "device789"
  }'
```

**Response:**
```json
{
  "_id": "6616a1b2c3d4e5f6g7h8i9j0",
  "amount": 10000,
  "riskScore": 45,
  "riskLevel": "MEDIUM",
  "fraudProbability": 0.35,
  "flaggedRules": ["new_recipient"],
  "timestamp": "2024-04-14T10:30:00Z"
}
```

### GET /api/v1/transactions
Fetch all transactions with optional filtering

```bash
# Get all transactions
curl https://your-api.up.railway.app/api/v1/transactions

# Filter by risk level
curl "https://your-api.up.railway.app/api/v1/transactions?riskLevel=HIGH"

# Pagination
curl "https://your-api.up.railway.app/api/v1/transactions?skip=0&limit=20"
```

### GET /api/v1/health
Health check endpoint

```bash
curl https://your-api.up.railway.app/api/v1/health
```

Response: `{ "status": "ok" }`

---

## Part 5: Production Checklist

Before going live:

- [ ] MongoDB Atlas cluster created and whitelisted
- [ ] Backend deployed to Railway/Render
- [ ] Environment variables set (MONGODB_URI, REDIS_HOST, ML_SERVICE_URL)
- [ ] Redis service running
- [ ] Python ML service deployed
- [ ] Frontend deployed to Vercel/Netlify
- [ ] CORS enabled for your frontend domain
- [ ] WebSocket connections tested
- [ ] SSL/TLS enabled (auto on Railway)
- [ ] Simulator disabled in production (.env)
- [ ] Error logging configured
- [ ] Rate limiting configured in throttler

---

## Part 6: Cost Breakdown

| Service | Free Tier | Cost |
|---------|-----------|------|
| MongoDB Atlas | 512 MB | FREE |
| Railway Backend | 5 GB bandwidth/mo | FREE |
| Railway Redis | 512 MB | FREE |
| Railway ML Service | 512 MB | FREE |
| Vercel Frontend | Unlimited | FREE |
| **TOTAL** | – | **$0/month** |

**When to upgrade:**
- MongoDB: > 512 MB data → ~$10/mo per 2 GB
- Railway: > 5 GB bandwidth → Free tier auto-resets monthly
- Frontend: > 100 GB bandwidth → ~$20/mo per project

---

## Part 7: Monitoring & Debugging

### View logs
```bash
# Railway dashboard → Logs tab
# Or CLI:
railway logs -f

# Render dashboard → Logs
```

### WebSocket connection issues?
```javascript
// Enable debug
import io from 'socket.io-client';
const socket = io(API_URL, {
  debug: true,
  autoConnect: true,
  reconnection: true
});

socket.on('connect', () => console.log('✅ Connected'));
socket.on('disconnect', () => console.log('❌ Disconnected'));
socket.on('error', (err) => console.error('Error:', err));
```

### Test API endpoints
- Swagger UI: `https://your-api.up.railway.app/api/v1/docs`
- Bull Board: `https://your-api.up.railway.app/queues`

---

## Part 8: Quick Reference - Environment Variables

**Backend (.env)**
```
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=xxxxx
ML_SERVICE_URL=https://ml-service.railway.app
CORS_ORIGIN=https://your-frontend.vercel.app
SIMULATOR_ENABLED=false
```

**Frontend (.env)**
```
REACT_APP_API_URL=https://your-api.up.railway.app
REACT_APP_WS_URL=wss://your-api.up.railway.app
```

---

## Troubleshooting

**Problem:** WebSocket connection fails
**Solution:** Ensure CORS_ORIGIN is set to your frontend domain in backend .env

**Problem:** ML service timeout  
**Solution:** Increase ML_SERVICE_TIMEOUT in .env (default 5000ms)

**Problem:** Redis connection error  
**Solution:** Verify REDIS_HOST, REDIS_PORT, REDIS_PASSWORD match Railway dashboard

**Problem:** MongoDB connection fails  
**Solution:** Check MongoDB Atlas IP whitelist includes `0.0.0.0/0` or add Railway IP

---

## 🚀 Next Steps

1. Create MongoDB Atlas account → Setup cluster
2. Push code to GitHub
3. Deploy backend to Railway
4. Deploy ML service
5. Create frontend app with sample code above
6. Deploy frontend to Vercel
7. Test WebSocket connection
8. Add your business logic & styling
9. Monitor logs & performance

**Total setup time: ~30 minutes**

Good luck! 🎉
