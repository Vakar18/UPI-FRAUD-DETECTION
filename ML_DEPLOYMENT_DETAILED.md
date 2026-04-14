# ML Service Deployment - STEP-BY-STEP with Examples

Complete guide to deploying ML service with exact commands and screenshots.

---

## 🎯 Your Goal

Deploy Python ML service on Railway and connect it to your backend in 15 minutes.

---

## 📝 Step-by-Step with Examples

### STEP 1: Prepare Your Repository (2 minutes)

#### What We're Doing
Adding two files that tell Railway how to run your Python app.

#### Files Already Created
✅ `Procfile` - how to start the app (in root)
✅ `runtime.txt` - Python version (in root)

#### Commit & Push
```bash
# From your terminal, in project root:
cd /home/plutosone-vakar/upi-fraud-detection

# Check files exist:
ls -la Procfile runtime.txt

# Output should show:
# Procfile
# runtime.txt

# Push to GitHub:
git add Procfile runtime.txt .env
git commit -m "Add ML service Railway deployment config"
git push origin main

# Verify on GitHub website:
# 1. Go to github.com/YOUR_USERNAME/upi-fraud-detection
# 2. Check that Procfile and runtime.txt appear in root
```

---

### STEP 2: Deploy on Railway (5 minutes)

#### What We're Doing
Tell Railway to deploy a new Python service from your GitHub repo.

#### 2.1 Open Railway Dashboard
```
URL: https://railway.app/dashboard
Login: Use your existing account (same as backend)
```

**You should see:**
- Your project listed
- Backend service already deployed
- Redis service already deployed

#### 2.2 Add ML Service

**Screenshot (text description):**
```
Dashboard shows:
┌─────────────────────────────────────────┐
│ Your Project: upi-fraud-detection      │
├─────────────────────────────────────────┤
│ Services:                               │
│ • NestJS API (Backend)         Running  │
│ • Redis                        Running  │
│ • [+ New Service] button               │
└─────────────────────────────────────────┘
```

**Action:**
```
1. Click "+ New Service" button
2. Choose "Deploy from GitHub repo"
3. Click "Existing repo" (don't choose template)
4. Find and select: upi-fraud-detection
5. Click "Deploy"
```

**Railway will automatically:**
- Detect Procfile
- Recognize it's a Python app
- Install dependencies from src/modules/ml/requirements.txt
- Start Gunicorn server

#### 2.3 Watch Deployment Progress

**Go to:** Deployments tab
**Look for logs like:**
```
Building image...
Installing dependencies...
flask==3.0.3
gunicorn==22.0.0
numpy==1.26.4
pandas==2.2.2
scikit-learn==1.4.2
...
✓ Build complete
✓ Starting container
Starting gunicorn...
INFO [ml-service] App initialized
Listening on port 5000
✓ Successfully deployed
```

**Expected time:** 2-3 minutes

---

### STEP 3: Get Your ML Service URL (2 minutes)

#### What We're Doing
Finding the public URL where Railway is serving your ML service.

#### 3.1 Open Railway Dashboard

**Location:** railway.app dashboard

**Screenshot (text):**
```
Project: upi-fraud-detection
├─ Service: NestJS Backend
│  └─ Domain: https://upi-fraud-backend-xxxxx.railway.app
├─ Service: Redis
│  └─ (Internal only, no domain)
└─ Service: Python ML [This one]
   └─ Settings tab...
```

#### 3.2 Click Python ML Service

**Then:**
```
1. Click the Python service (should say "python" or "Flask")
2. Look at the top - should show service name
3. Click "Settings" tab
4. Scroll down to "Domains" section
```

#### 3.3 Copy the Domain URL

**You'll see:**
```
Public URLs
├─ https://upi-fraud-ml-xxxxx.railway.app
└─ Custom Domain options...
```

**Copy this URL:**
```
https://upi-fraud-ml-xxxxx.railway.app
```

**Save it in a safe place!** You'll use it next.

---

### STEP 4: Test ML Service Works (2 minutes)

#### What We're Doing
Verify the ML service is actually running and responding.

#### 4.1 Test Health Endpoint

**Open Terminal:**
```bash
# Test if service is alive
curl https://upi-fraud-ml-xxxxx.railway.app/health

# Expected response:
# {"status": "healthy", "model": "loaded", "model_version": "1.0"}
# HTTP/1.1 200 OK

# If you see:
# ✓ HTTP 200
# ✓ "status": "healthy"
# Then ML service is working! ✅
```

#### 4.2 Test Prediction Endpoint

**Run this command:**
```bash
# Send test transaction data
curl -X POST https://upi-fraud-ml-xxxxx.railway.app/predict \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "senderId": "user_test_123",
    "recipientId": "user_new_456",
    "transactionsCount": 3,
    "isNewRecipient": 1,
    "dayOfWeek": 2,
    "hourOfDay": 14
  }'

# Expected response (approximately):
{
  "fraud_probability": 0.42,
  "risk_score": 42,
  "model_version": "1.0",
  "confidence": 0.85,
  "prediction_time_ms": 125
}

# Success indicators:
# ✓ HTTP 200 OK
# ✓ fraud_probability is between 0 and 1
# ✓ risk_score is between 0 and 100
# ✓ prediction_time_ms is < 1000ms
```

**If both tests pass:** ✅ ML Service is working!

---

### STEP 5: Update Your .env File (2 minutes)

#### What We're Doing
Tell your backend where to find the ML service.

#### 5.1 Open .env File
```bash
# File location:
/home/plutosone-vakar/upi-fraud-detection/.env

# Open in editor:
nano .env
# or
code .env
```

#### 5.2 Find ML_SERVICE_URL

**Look for:**
```bash
# Find this line (current):
ML_SERVICE_URL=http://localhost:5000

# Change it to your Railway URL:
ML_SERVICE_URL=https://upi-fraud-ml-xxxxx.railway.app
```

**Replace:**
```bash
# OLD:
ML_SERVICE_URL=http://localhost:5000

# NEW:
ML_SERVICE_URL=https://upi-fraud-ml-xxxxx.railway.app

# Note: 
# - Remove http://localhost:5000
# - Add https://your-ml-url
# - No trailing slash (/)
```

#### 5.3 Save and Commit
```bash
# Save the file

# Commit changes:
git add .env
git commit -m "Update ML service URL from localhost to Railway"
git push origin main

# Verify on GitHub website:
# .env should show your new URL
```

---

### STEP 6: Update Backend in Railway (3 minutes)

#### What We're Doing
Tell your already-deployed backend about the new ML service URL.

#### 6.1 Open Railway Dashboard

**Go to:** https://railway.app/dashboard

**Click:** Your project → Backend service (NestJS)

#### 6.2 Update Variables

**Screenshot (text):**
```
Backend Service
├─ Deployments tab: Shows current deploy
├─ Logs tab: Shows running logs
├─ Settings tab: Shows service settings
└─ Variables tab: ← CLICK THIS
   ├─ NODE_ENV: production
   ├─ PORT: 3000
   ├─ MONGODB_URI: mongodb+srv://...
   ├─ REDIS_HOST: redis.railway.internal
   ├─ ML_SERVICE_URL: http://localhost:5000  ← THIS LINE
   └─ [more variables...]
```

#### 6.3 Change ML_SERVICE_URL

**In Variables tab:**
```
Find the line: ML_SERVICE_URL=http://localhost:5000

Click the VALUE field and change to:
ML_SERVICE_URL=https://upi-fraud-ml-xxxxx.railway.app

Press Enter or click Save

Railway will show: ✓ Updated
```

#### 6.4 Wait for Redeploy

**Railway automatically redeploys:**
```
• Stops backend
• Updates environment variables
• Restarts backend with new ML URL
• Takes about 1-2 minutes

Watch the Logs tab:
✓ Stopping...
✓ Building...
✓ Starting...
✓ Ready on https://your-backend.railway.app
```

---

### STEP 7: Verify Full Integration (2 minutes)

#### What We're Doing
Test that backend can successfully reach ML service.

#### 7.1 Test Full Transaction Flow

**Open Terminal:**
```bash
# Create a transaction through your backend
curl -X POST https://your-backend.railway.app/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 75000,
    "senderId": "user_integration_test",
    "recipientId": "user_new_test",
    "paymentMethod": "UPI"
  }'

# Expected response:
{
  "_id": "6616a1b2c3d4e5f...",
  "amount": 75000,
  "senderId": "user_integration_test",
  "recipientId": "user_new_test",
  "riskScore": 55,                    ← From ML service!
  "riskLevel": "MEDIUM",
  "fraudProbability": 0.45,           ← From ML service!
  "flaggedRules": ["high_amount", "new_recipient"],
  "status": "PROCESSED",
  "mlScore": {
    "fraud_probability": 0.45,
    "risk_score": 55,
    "model_version": "1.0",
    "prediction_time_ms": 234
  },
  "createdAt": "2024-04-14T14:30:05Z"
}

# Success indicators:
# ✓ HTTP 200 OK
# ✓ riskScore is calculated
# ✓ fraudProbability is from ML (0-1)
# ✓ mlScore section shows ML service sent data
# ✓ prediction_time_ms is < 1000
```

#### 7.2 Check Backend Logs

**In Railway Dashboard:**
```
Backend Service → Logs tab

Look for lines like:
[16:30:05] ✓ Request to ML service succeeded
[16:30:05] ML response: fraud_probability: 0.45
[16:30:05] Transaction saved with risk_score: 55

If you see errors like:
[16:30:05] ✗ ML Service timeout
[16:30:05] ✗ Connection refused
[16:30:05] ✗ ECONNREFUSED

Then ML_SERVICE_URL is still incorrect!
```

#### 7.3 Check ML Logs

**In Railway Dashboard:**
```
ML Service → Logs tab

Look for:
[16:30:04] POST /predict - incoming request
[16:30:04] Processing features...
[16:30:04] Model inference: 0.45
[16:30:04] Response sent in 125ms

This means ML service received the request!
```

---

## 🎯 Complete Example Workflow

### Your Current URL Situation
```
Before:
├─ Backend: https://your-backend.railway.app ✅ Already deployed
├─ ML Service: http://localhost:5000 ❌ Not deployed (local only)
└─ Result: backend crashes when trying to call localhost

After ML deployment:
├─ Backend: https://your-backend.railway.app ✅
├─ ML Service: https://upi-fraud-ml-xxxxx.railway.app ✅ NEW!
└─ Result: everything works! ✅
```

### Timeline
```
Time: 0:00 - Start
├─ 0:02 - Push Procfile & runtime.txt to GitHub ✓
├─ 0:05 - Railway deploys ML service ✓
├─ 0:10 - Get ML service URL ✓
├─ 0:12 - Test ML endpoints (health & predict) ✓
├─ 0:14 - Update .env with new URL ✓
├─ 0:15 - Update Railway backend variables ✓
├─ 0:17 - Backend redeploys with new URL ✓
├─ 0:19 - Test full integration ✓
└─ 0:20 - DONE! System fully connected ✓
```

---

## 📋 Copy-Paste Commands

### Quick Push to GitHub
```bash
git add Procfile runtime.txt .env
git commit -m "Add ML service deployment config"
git push origin main
```

### Test ML Service Health
```bash
# Replace URL with your actual URL
curl https://upi-fraud-ml-xxxxx.railway.app/health
```

### Test ML Prediction
```bash
curl -X POST https://upi-fraud-ml-xxxxx.railway.app/predict \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "senderId": "user123",
    "recipientId": "user456",
    "transactionsCount": 5,
    "isNewRecipient": 1,
    "dayOfWeek": 0,
    "hourOfDay": 14
  }'
```

### Test Full Integration
```bash
curl -X POST https://your-backend.railway.app/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 75000,
    "senderId": "user_test",
    "recipientId": "user_new",
    "paymentMethod": "UPI"
  }'
```

---

## ✅ Success Checklist (Mark as you go)

- [ ] Procfile created & pushed to GitHub
- [ ] runtime.txt created & pushed to GitHub
- [ ] ML service deployed on Railway
- [ ] ML service has a public URL
- [ ] ML health endpoint returns 200 OK
- [ ] ML predict endpoint works
- [ ] .env file updated with ML URL
- [ ] Backend .env or Railway variables updated
- [ ] Backend redeploy complete
- [ ] Backend logs show no ML timeout errors
- [ ] Full transaction test returns fraud calculations
- [ ] mlScore section visible in response

**All checked?** ✅ You're done!

---

## 🔧 Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| ML service won't deploy | Procfile syntax error - must be `web: cd src/modules/ml && gunicorn --bind 0.0.0.0:$PORT app:app` |
| 502 Bad Gateway from ML | Service crashed - check Python errors in logs, click Redeploy |
| Backend can't reach ML | ML_SERVICE_URL still set to localhost:5000 check Railway Variables tab |
| Timeout errors | ML taking too long - increase ML_SERVICE_TIMEOUT=10000 in backend vars |
| No fraud calculations | ML score not being used - verify riskScore > 0 and fraudProbability value |

---

## 📞 Getting Help

If something fails:

1. **Check ML service logs:**
   - Railway dashboard → ML service → Logs tab
   - Look for Python errors or crashes

2. **Check backend logs:**
   - Railway dashboard → Backend → Logs tab
   - Look for "ML Service timeout" or "ECONNREFUSED"

3. **Verify URLs:**
   - ML health: `curl https://ml-url/health`
   - Backend health: `curl https://backend-url/api/v1/health`
   - Both must return 200 OK

4. **Redeploy if needed:**
   - Railway dashboard → Service → Redeploy button
   - Wait 2-3 minutes for restart

---

**You've got this! Complete all 7 steps and you'll have a fully integrated fraud detection system. 🚀**
