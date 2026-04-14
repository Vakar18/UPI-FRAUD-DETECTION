# 🚀 FREE DEPLOYMENT QUICK START (30 Minutes)

Complete checklist to deploy your entire UPI fraud detection system for FREE and get your frontend connected.

---

## Phase 1: Setup Cloud Services (10 minutes)

### ☐ MongoDB Atlas (Free Database)
```
1. Go: mongodb.com/cloud/atlas → Sign up (free)
2. Create NEW PROJECT
3. Create FREE Cluster (M0, 512MB)
4. Wait 5-10 minutes for cluster to initialize
5. Click CONNECT → Create Database User (username: admin, password: yourpassword)
6. Network Access → Add IP: 0.0.0.0/0 (Allow all)
7. Copy CONNECTION STRING:
   mongodb+srv://admin:yourpassword@cluster0.xxxxx.mongodb.net/?retryWrites=true
8. Save this somewhere safe ✓
```

### ☐ Railway.app (Free Backend Hosting)
```
1. Go: railway.app → Sign up with GitHub (FREE)
2. Create NEW PROJECT
3. Don't select template yet → Keep for next step
```

### ☐ Vercel (Free Frontend Hosting)
```
1. Go: vercel.com → Sign up with GitHub (FREE)
2. Create NEW PROJECT (save for later)
```

---

## Phase 2: Prepare Your GitHub Repository (5 minutes)

```bash
# Ensure you're in project root
cd /home/plutosone-vakar/upi-fraud-detection

# Verify files are ready
ls -la DEPLOYMENT_GUIDE.md
ls -la SAMPLE_FRONTEND_COMPONENT.jsx
ls -la src/
ls -la docker-compose.yml

# Push to GitHub (if not already)
git add .
git commit -m "Add deployment guides and sample frontend"
git push origin main
```

---

## Phase 3: Deploy Backend to Railway (7 minutes)

### ☐ Step 1: Connect Repository
```
1. Go to railway.app dashboard
2. Click "+ New Project"
3. Select "Deploy from GitHub"
4. Authorize Railway with GitHub
5. Select your repo: upi-fraud-detection
6. Click DEPLOY
7. Wait for Railway to detect NestJS framework
```

### ☐ Step 2: Add Services
```
1. In Railway dashboard, click "Add Service" → Select "Redis"
   - Wait for Redis to initialize
   
2. Click "Add Service" → Select "MongoDB"
   - We'll use cloud databases instead, skip this
```

### ☐ Step 3: Configure Environment Variables
```
In Railway Dashboard → Variables tab → click "Raw Editor"

Paste:
```
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1
MONGODB_URI=mongodb+srv://admin:yourpassword@cluster0.xxxxx.mongodb.net/upi_fraud_detection?retryWrites=true
MONGODB_DB_NAME=upi_fraud_detection
REDIS_HOST=redis.railway.internal
REDIS_PORT=6379
ML_SERVICE_URL=https://[ml-service-domain-from-step4]
ML_SERVICE_TIMEOUT=5000
FRAUD_RISK_THRESHOLD=70
MEDIUM_RISK_THRESHOLD=40
SIMULATOR_ENABLED=false
CORS_ORIGIN=https://[your-frontend-domain-vercel]
```

**Note:** You'll update ML_SERVICE_URL and CORS_ORIGIN after deploying frontend & ML service
```

### ☐ Step 4: Wait for Deployment
```
- Railway auto-builds and deploys
- Watch the logs
- Look for: "Application running on..."
- Your backend URL will be: https://your-project-up.railway.app
- Save this URL! ✓
```

### ☐ Step 5: Deploy ML Service (Python)
```
In same Railway project:
1. Click "Add Service" → "GitHub repository"
2. Select same repo
3. Click "Deploy"

In variables, add:
```
FLASK_ENV=production
```

Wait for deployment. Your ML service URL will be auto-generated ✓
```

---

## Phase 4: Create & Deploy Frontend (8 minutes)

### ☐ Step 1: Create React App Locally
```bash
# Create new React app
npx create-react-app fraud-detection-frontend
cd fraud-detection-frontend

# Install dependency
npm install socket.io-client axios
```

### ☐ Step 2: Add Dashboard Component
```bash
# Copy the sample component
cp /home/plutosone-vakar/upi-fraud-detection/SAMPLE_FRONTEND_COMPONENT.jsx src/pages/Dashboard.jsx

# Create pages folder if not exists
mkdir -p src/pages
```

### ☐ Step 3: Update App.js
```javascript
// src/App.js
import Dashboard from './pages/Dashboard';

function App() {
  return <Dashboard />;
}

export default App;
```

### ☐ Step 4: Create .env file
```bash
# .env (in frontend root)
REACT_APP_API_URL=https://your-backend-railway-url
REACT_APP_WS_URL=wss://your-backend-railway-url
```

### ☐ Step 5: Test Locally
```bash
npm start
# Visit http://localhost:3000
# Should see dashboard (might show connection error - normal for now)
```

### ☐ Step 6: Push to GitHub
```bash
git init
git add .
git commit -m "Initial fraud detection frontend"
git remote add origin https://github.com/YOUR_USERNAME/fraud-detection-frontend
git branch -M main
git push -u origin main
```

### ☐ Step 7: Deploy to Vercel
```
1. Go: vercel.com → New Project
2. Import from GitHub → Select fraud-detection-frontend
3. Set Environment Variables:
   - REACT_APP_API_URL=https://your-backend-railway-url
   - REACT_APP_WS_URL=wss://your-backend-railway-url
4. Deploy
5. Your frontend URL: https://fraud-detection-frontend.vercel.app ✓
```

---

## Phase 5: Connect Everything (5 minutes)

### ☐ Update Backend Environment Variables
```
Go back to Railway backend project
1. Variables tab → Raw Editor
2. Update:
   CORS_ORIGIN=https://fraud-detection-frontend.vercel.app
   ML_SERVICE_URL=https://your-ml-service-railway.app
3. Save → Railway auto-redeploys
```

### ☐ Test WebSocket Connection
```
1. Open frontend: https://fraud-detection-frontend.vercel.app
2. Open browser console (F12)
3. Should see: "✅ Connected" in top right
4. Submit a test transaction
5. Should see it in Recent Transactions table
```

---

## Phase 6: Verification Checklist

- [ ] Frontend loads without errors
- [ ] Backend API URL showing in browser console
- [ ] WebSocket shows "✅ Connected"
- [ ] Can submit transaction from form
- [ ] Transaction appears in table
- [ ] Risk score is calculated (0-100)
- [ ] Swagger docs work: `https://your-backend/api/v1/docs`
- [ ] All components talking to each other ✓

---

## API Endpoints to Test

### Create Transaction
```bash
curl -X POST https://your-backend-railway.app/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "senderId": "user123",
    "recipientId": "user456",
    "paymentMethod": "UPI"
  }'
```

### Get All Transactions
```bash
curl https://your-backend-railway.app/api/v1/transactions
```

### Health Check
```bash
curl https://your-backend-railway.app/api/v1/health
```

### View Swagger Docs
```
https://your-backend-railway.app/api/v1/docs
```

---

## Free Tier Limits & Cost Summary

| Component | Free Limit | When to Upgrade |
|-----------|-----------|-----------------|
| **MongoDB Atlas** | 512 MB | > 512 MB data ($10/2GB) |
| **Railway Backend** | 5 GB bandwidth/mo | > 5 GB bandwidth (~$5) |
| **Railway Redis** | 512 MB RAM | > 512 MB ($5/mo) |
| **Railway ML** | 512 MB RAM | > 512 MB ($5/mo) |
| **Vercel Frontend** | 100 GB bandwidth | > 100 GB bandwidth ($20) |
| **TOTAL COST** | **$0** | **~$15-45/mo** (when scaling) |

---

## Troubleshooting

### ❌ "WebSocket connection failed"
**Solution:** 
- Check CORS_ORIGIN in backend matches frontend URL
- Wait 2-3 mins after Railway redeploys
- Try hard refresh (Ctrl+Shift+Delete)

### ❌ "404 Not Found" on API calls
**Solution:**
- Verify REACT_APP_API_URL is correct (no trailing slash)
- Check backend is running in Railway logs
- Ensure `/api/v1/` prefix in URL

### ❌ "MongoDB connection timeout"
**Solution:**
- Check MongoDB connection string is correct
- Verify IP whitelist includes `0.0.0.0/0` in Atlas dashboard
- Wait 5 minutes after creating database user

### ❌ "ML service timeout"
**Solution:**
- Verify ML service deployed successfully in Railway
- Increase ML_SERVICE_TIMEOUT to 10000
- Check ML service logs for errors

### ❌ Frontend shows "can't reach API"
**Solution:**
- Verify backend is running: `https://your-backend/api/v1/health`
- Check browser console (F12) for actual error
- CORS_ORIGIN must exactly match frontend domain

---

## Live Testing Data

Use these test transactions to verify everything works:

```javascript
// High Risk (Fraudulent)
{
  "amount": 100000,
  "senderId": "user_new_123",  // New user
  "recipientId": "user_new_456",  // New recipient
  "paymentMethod": "UPI"
}

// Medium Risk
{
  "amount": 50000,
  "senderId": "user_existing_789",
  "recipientId": "user_new_111",  // First time transfer
  "paymentMethod": "UPI"
}

// Low Risk
{
  "amount": 1000,
  "senderId": "user_frequent_123",
  "recipientId": "user_frequent_456",  // Regular recipient
  "paymentMethod": "UPI"
}
```

---

## Next Steps

1. ✅ Complete all Phase checkboxes above
2. ✅ Verify all endpoints work in Swagger: `https://backend-url/api/v1/docs`
3. ✅ Test WebSocket connection from frontend
4. ✅ Create 5-10 test transactions
5. ✅ Monitor logs in Railway dashboard
6. ✅ Add your own styling/branding to frontend
7. ✅ Develop additional features (analytics, charts, etc.)
8. ✅ Add authentication for production

---

## Additional Resources

- Railway Docs: https://docs.railway.app/
- MongoDB Atlas Guide: https://docs.atlas.mongodb.com/
- Vercel Docs: https://vercel.com/docs
- NestJS Guide: https://docs.nestjs.com/
- Socket.IO Docs: https://socket.io/docs/
- Full Deployment Guide: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## Support & Debugging

**Check logs:**
```bash
# Railway backend logs
# Dashboard → Logs tab (real-time)

# Frontend errors
# Browser → F12 → Console tab

# API health check
curl -v https://your-backend/api/v1/health
```

**Common Commands:**
```bash
# Rebuild frontend
cd fraud-detection-frontend
npm run build

# Test API locally (if running locally)
npm test

# Check build size
npm run build && du -sh build/
```

---

**Estimated Time: 30 minutes total**
**Estimated Cost: $0 (free tier)**
**Good luck! 🎉**
