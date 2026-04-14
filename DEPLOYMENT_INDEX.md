# 📚 Deployment Documentation - Index & Quick Reference

Complete guide to deploying your UPI Fraud Detection system for free and connecting frontend applications.

---

## 🎯 Quick Links by Use Case

### **I want to deploy NOW (30 minutes)**
→ Start with: [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)
- Step-by-step checklist
- Copy-paste configuration
- Verification checklist

### **I want to understand the full architecture**
→ Read: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- Free hosting options comparison
- Detailed setup instructions
- Monitoring & debugging
- Cost breakdown

### **I'm building a frontend application**
→ Read: [FRONTEND_INTEGRATION_GUIDE.md](./FRONTEND_INTEGRATION_GUIDE.md)
- REST API reference
- WebSocket real-time events
- Complete code examples
- Error handling patterns
- Performance tips

### **I want a working example immediately**
→ Copy: [SAMPLE_FRONTEND_COMPONENT.jsx](./SAMPLE_FRONTEND_COMPONENT.jsx)
- Production-ready React component
- Dashboard with transaction management
- Real-time alerts
- Live stats

---

## 📊 Architecture Overview

```
┌────────────────────────────────────────────┐
│      FRONTEND (React / Vue / Angular)      │
│    Hosted: Vercel, Netlify (FREE)          │
└────────────┬─────────────────────────────┘
             │
    HTTP (REST) + WebSocket
             │
┌────────────▼─────────────────────────────┐
│    NestJS Backend API                     │
│    Hosted: Railway, Render (FREE)         │
│    - /api/v1/transactions (POST/GET)      │
│    - WebSocket events (real-time)         │
│    - Swagger docs                         │
└────────────┬──────────────┬──────────────┘
             │              │
      MongoDB │              │ Redis
      Atlas   │              │ BullMQ Queue
      (FREE)  │              │ (Railway FREE)
             │              │
             ▼              ▼
    ┌──────────────┐  ┌──────────────┐
    │  Cloud DB    │  │  Job Queue   │
    │  512 MB      │  │  512 MB RAM  │
    └──────────────┘  └──────────────┘
```

---

## 🚀 Deployment Options Comparison

| Service | Best For | Free Tier | Easy Rating |
|---------|----------|-----------|------------|
| **Railway** | Backend + ML Service | 5 GB bandwidth/mo | ⭐⭐⭐⭐⭐ |
| **Render** | Backend (alternative) | Limited but free | ⭐⭐⭐⭐ |
| **MongoDB Atlas** | Database | 512 MB | ⭐⭐⭐⭐⭐ |
| **Vercel** | Frontend | 100 GB bandwidth | ⭐⭐⭐⭐⭐ |
| **Netlify** | Frontend (alternative) | 100 GB bandwidth | ⭐⭐⭐⭐⭐ |

**Recommended:** Railway + MongoDB Atlas + Vercel

---

## 💰 Cost Breakdown

| Component | Free Limit | Upgrade Cost |
|-----------|-----------|--------------|
| Backend (Railway) | 5 GB/mo bandwidth | $5/mo |
| Database (MongoDB) | 512 MB | $10/mo per 2GB |
| Redis (Railway) | 512 MB RAM | $5/mo |
| Frontend (Vercel) | 100 GB/mo bandwidth | $20/mo |
| **TOTAL** | **$0** | ~$15-40/mo at scale |

---

## 📝 Key Files in This Project

```
upi-fraud-detection/
├── QUICK_DEPLOY.md                      ← 30-minute deployment guide
├── DEPLOYMENT_GUIDE.md                  ← Complete deployment guide
├── FRONTEND_INTEGRATION_GUIDE.md        ← API reference for developers
├── SAMPLE_FRONTEND_COMPONENT.jsx        ← Copy-paste React component
│
├── docker-compose.yml                   ← Local dev environment
├── package.json                         ← Node dependencies
├── .env                                 ← Configuration
│
├── src/
│   ├── app.module.ts                    ← Main app module
│   ├── main.ts                          ← Entry point
│   └── modules/
│       ├── transactions/                ← Transaction endpoints
│       ├── ml/                          ← ML scoring service
│       ├── gateway/                     ← WebSocket alerts
│       └── health/                      ← Health checks
│
├── Dockerfile                           ← Production image
└── README.md                            ← Original project readme
```

---

## 🔧 Environment Variables Reference

### Backend (.env)
```bash
# Server
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
MONGODB_DB_NAME=upi_fraud_detection

# Cache
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=xxxxx

# ML Service
ML_SERVICE_URL=https://ml-service.railway.app
ML_SERVICE_TIMEOUT=5000

# Thresholds
FRAUD_RISK_THRESHOLD=70
MEDIUM_RISK_THRESHOLD=40

# Features
SIMULATOR_ENABLED=false
CORS_ORIGIN=https://your-frontend.vercel.app
```

### Frontend (.env)
```bash
REACT_APP_API_URL=https://your-backend.railway.app
REACT_APP_WS_URL=wss://your-backend.railway.app
```

---

## 📡 API Endpoints

### Transactions
```bash
# Create transaction
POST /api/v1/transactions

# Get all transactions
GET /api/v1/transactions?skip=0&limit=20

# Get single transaction
GET /api/v1/transactions/:id
```

### Health
```bash
# Health check
GET /api/v1/health
```

### Documentation
```bash
# Swagger UI
GET /api/v1/docs

# ReDoc
GET /api/v1/redoc

# Bull Board (queue management)
GET /queues
```

---

## 🔌 WebSocket Events

### Events from Server → Client

```javascript
// Fraud Alert (High risk transaction)
socket.on('fraud-alert', (data) => {
  console.log('Alert:', data.message);
  // data.riskScore, data.amount, data.flaggedRules
});

// Transaction Scored
socket.on('txn-scored', (data) => {
  console.log('Transaction scored:', data.riskScore);
});

// Stats Update
socket.on('stats-update', (data) => {
  console.log('Stats:', data.totalTransactions);
});

// Connection Events
socket.on('connect', () => console.log('Connected'));
socket.on('disconnect', () => console.log('Disconnected'));
socket.on('error', (err) => console.error('Error:', err));
```

---

## 📋 Deployment Checklist

### Phase 1: Preparation
- [ ] Read QUICK_DEPLOY.md
- [ ] Have GitHub account ready
- [ ] Code pushed to GitHub
- [ ] `.env.example` exists in repo

### Phase 2: Cloud Services (10 minutes)
- [ ] MongoDB Atlas cluster created
- [ ] Database user created
- [ ] IP whitelist set to `0.0.0.0/0`
- [ ] Connection string copied

### Phase 3: Backend Deployment (5 minutes)
- [ ] Railway account created
- [ ] GitHub repo connected
- [ ] Environment variables set
- [ ] Backend deployed successfully
- [ ] Health check passing

### Phase 4: Services (5 minutes)
- [ ] Redis service added (Railway)
- [ ] ML service deployed (Railway)
- [ ] Environment variables updated

### Phase 5: Frontend (5 minutes)
- [ ] React app created
- [ ] Sample component copied
- [ ] Environment variables set
- [ ] Frontend deployed to Vercel/Netlify

### Phase 6: Integration (5 minutes)
- [ ] CORS_ORIGIN updated in backend
- [ ] WebSocket connection tested
- [ ] Sample transaction submitted
- [ ] Alert received successfully

### Phase 7: Verification
- [ ] Frontend loads without errors
- [ ] API endpoints return 200 OK
- [ ] WebSocket shows "✅ Connected"
- [ ] Real-time events working
- [ ] Swagger docs accessible

---

## 🐛 Troubleshooting Guide

### WebSocket Connection Failed
```
Causes:
- CORS_ORIGIN not set correctly
- Wrong WebSocket URL
- Backend not running

Solution:
- Check CORS_ORIGIN matches frontend domain exactly
- Use wss:// for HTTPS (https domain + websocket)
- Wait 2 mins after Railway redeploys
- Hard refresh: Ctrl+Shift+Delete
```

### API Returns 404
```
Causes:
- Missing /api/v1 prefix
- Trailing slash in URL
- Backend not deployed

Solution:
- URL should be: https://app.railway.app/api/v1/transactions
- Check: https://app.railway.app/api/v1/health
- View logs in Railway dashboard
```

### MongoDB Connection Error
```
Causes:
- Wrong connection string
- IP not whitelisted
- Invalid credentials

Solution:
- Copy full connection string from MongoDB Atlas
- Check IP whitelist includes 0.0.0.0/0
- Verify username/password in string
- Wait 5 mins after user creation
```

### Timeout Errors
```
Causes:
- ML service too slow
- Database overloaded
- Network latency

Solution:
- Increase ML_SERVICE_TIMEOUT to 10000
- Check Railway logs for errors
- Use skip/limit pagination: ?skip=0&limit=20
- Upgrade free tier if needed
```

---

## 📞 Support Resources

### Documentation
- [NestJS Docs](https://docs.nestjs.com)
- [MongoDB Atlas Guide](https://docs.atlas.mongodb.com)
- [Socket.IO Docs](https://socket.io/docs)
- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)

### Testing
- Swagger UI: `https://your-backend/api/v1/docs`
- Bull Board: `https://your-backend/queues`
- Browser DevTools: F12 → Network & Console tabs

### Live Logs
```bash
# Railway CLI
npm i -g @railway/cli
railway login
railway logs -f

# Docker Compose (local)
docker-compose logs -f [service-name]
```

---

## 🎓 Learning Path

1. **Understand Architecture** (10 min)
   - Read this file
   - Read DEPLOYMENT_GUIDE.md overview

2. **Quick Deploy** (30 min)
   - Follow QUICK_DEPLOY.md checklist
   - Deploy all services

3. **Test Integration** (10 min)
   - Deploy sample component
   - Submit test transactions
   - Verify WebSocket events

4. **Read API Details** (20 min)
   - Study FRONTEND_INTEGRATION_GUIDE.md
   - Review example code

5. **Build Your App** (varies)
   - Start with SAMPLE_FRONTEND_COMPONENT.jsx
   - Add your business logic
   - Style for your brand

---

## ✅ Success Criteria

You're successfully deployed when:

✓ Frontend loads at `https://your-app.vercel.app`
✓ Backend API returns data: `https://your-backend.railway.app/api/v1/health`
✓ WebSocket shows `✅ Connected` in top-right
✓ Submit transaction → appears in table
✓ High-risk transaction → alert fires
✓ Swagger docs work: `https://your-backend/api/v1/docs`
✓ No CORS errors in browser console (F12)

---

## 🚀 Next Steps After Deployment

1. **Customize Frontend**
   - Add your logo/branding
   - Modify dashboard layout
   - Add more pages/features

2. **Add Authentication**
   - Implement JWT auth
   - Add login page
   - Protect API endpoints

3. **Monitor Production**
   - Set up error logging (Sentry, LogRocket)
   - Add monitoring dashboard
   - Track performance metrics

4. **Scale Up**
   - Upgrade free tiers when needed
   - Add more ML features
   - Implement advanced alerting

5. **Production Hardening**
   - Rate limiting
   - Input validation
   - Security headers
   - API key management

---

## 📊 Documentation Map

```
START HERE ─→ QUICK_DEPLOY.md
                    ↓
        (30 min deployment)
                    ↓
    ┌───────────────┬────────────────┐
    ↓               ↓                ↓
DEPLOYMENT_GUIDE   FRONTEND_GUIDE   SAMPLE_COMPONENT
(In-depth)         (API Reference)  (Copy-paste code)
    │               │                │
    ├─ Services     ├─ REST API      ├─ React component
    ├─ Monitoring   ├─ WebSocket     ├─ Ready to use
    └─ Production   └─ Examples      └─ Full featured
```

---

## 💡 Pro Tips

1. **Use Railway for everything** - All-in-one platform, easier integration
2. **Test locally first** - Run `npm run start:dev` before deploying
3. **Monitor from day 1** - Railway/Render dashboards show everything
4. **Keep Swagger/Bull Board open** - Great for debugging
5. **Document your customizations** - Fork this guide for your project
6. **Start small** - Deploy basic version first, add features later
7. **Test WebSocket early** - This is the most common integration point
8. **Use environment variables** - Never hardcode URLs or secrets

---

**Total Deployment Time: ~30-45 minutes**
**Total Cost: $0**
**Go live: Today! 🎉**

For detailed instructions, start with [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)
