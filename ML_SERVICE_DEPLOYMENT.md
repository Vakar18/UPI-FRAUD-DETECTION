# 🤖 ML Service Deployment Guide - Railway

Complete guide to deploy the Python ML microservice to Railway and connect it to your backend.

---

## 📋 Prerequisites

- Railway account (already have - used for backend)
- Your backend already deployed on Railway ✓
- Your Repository pushed to GitHub ✓

---

## 🚀 Step-by-Step ML Service Deployment

### Phase 1: Add Deployment Files to Your Project (2 minutes)

Your project already has the ML service at `src/modules/ml/`, but we need to add a **Procfile** so Railway knows how to run the Python service.

#### File 1: Create Procfile in Root
```bash
# Location: /project-root/Procfile
web: cd src/modules/ml && gunicorn --bind 0.0.0.0:$PORT app:app
```

This tells Railway to:
- Navigate to the ML directory
- Run the Flask app using Gunicorn
- Listen on the PORT that Railway assigns

#### File 2: Verify requirements.txt exists
```bash
# Should already exist at: src/modules/ml/requirements.txt
cat src/modules/ml/requirements.txt
```

The file contains all Python dependencies. Railway will auto-detect and install them.

#### File 3: Create a file to select Python version (optional but recommended)
```bash
# Location: runtime.txt
python-3.12.0
```

This ensures Railway uses Python 3.12 (same as Dockerfile).

---

### Phase 2: Push Changes to GitHub (2 minutes)

```bash
# From project root
git add Procfile runtime.txt
git commit -m "Add deployment config for ML service"
git push origin main
```

Verify on GitHub that both files appear in your repo root.

---

### Phase 3: Deploy ML Service to Railway (5 minutes)

#### Step 1: Go to Railway Dashboard
```
1. Open: railway.app → Dashboard
2. Click on your existing project (same one with backend & Redis)
```

#### Step 2: Add a New Service
```
1. Click "+ New Service" button
2. Select "Deploy from GitHub repo"
3. Click "Existing repo"
4. Select your upi-fraud-detection repo
```

#### Step 3: Configure the ML Service
```
1. Railway will detect the Procfile
2. It will show "Python" as the framework
3. Click "Deploy"
4. Watch the build logs (should take 2-3 minutes)
```

**Make sure in the logs you see:**
```
✓ Installing dependencies (requirements.txt)
✓ Building Flask app
✓ Starting gunicorn on port 5000
```

#### Step 4: Get the ML Service URL
```
Once deployed, go to Deployments page:
1. Click the new ML service
2. Go to "Settings" tab
3. Look for "Domains" section
4. Your URL will be: https://upi-fraud-detection-xxxxx.railway.app

Copy this URL ✓
```

---

### Phase 4: Configure Environment Variables (3 minutes)

#### Step 1: In Railway Dashboard
```
1. Click your ML service
2. Go to "Variables" tab
3. Click "Raw Editor"
4. Add these variables:
```

```bash
PORT=5000
FLASK_ENV=production
FRAUD_RISK_THRESHOLD=70
MEDIUM_RISK_THRESHOLD=40
```

#### Step 2: Save and Redeploy
```
Railway auto-detects changes and redeploys (~1 minute)
Watch the logs to confirm successful deployment
```

---

### Phase 5: Test ML Service Deployment (2 minutes)

#### Test 1: Health Check
```bash
curl https://your-ml-service.railway.app/health

# Should return:
# {"status": "healthy", "model": "loaded"}
```

#### Test 2: Make Prediction
```bash
curl -X POST https://your-ml-service.railway.app/predict \
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

# Should return:
# {"fraud_probability": 0.45, "risk_score": 45}
```

If both tests pass ✓ → ML service is working!

---

## 📝 Update Backend .env with ML Service URL

### Step 1: Update Local .env File
```bash
# File: .env (in project root)

# Find this line:
ML_SERVICE_URL=http://localhost:5000

# Replace with:
ML_SERVICE_URL=https://your-ml-service.railway.app
```

### Step 2: Push Changes to GitHub
```bash
git add .env
git commit -m "Update ML service URL for Railway"
git push origin main
```

### Step 3: Update Backend Service Environment Variables

**Option A: Via Railway Dashboard (Recommended)**
```
1. Go to Railway Dashboard → Your project
2. Click on the Backend service (NestJS)
3. Go to "Variables" tab
4. Find: ML_SERVICE_URL
5. Change from: http://localhost:5000
   To: https://your-ml-service.railway.app
6. Save → Railway auto-redeploys backend
```

**Option B: Via .env.production file**
```
Create file: .env.production
Content:
ML_SERVICE_URL=https://your-ml-service.railway.app
```

---

## 🔍 Verify Everything is Connected

### Test 1: Check Backend can reach ML Service
```bash
# From your backend terminal
curl -X POST https://your-backend.railway.app/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 30000,
    "senderId": "user123",
    "recipientId": "user456",
    "paymentMethod": "UPI"
  }'

# Response should include:
# "fraudProbability": 0.35,
# "riskScore": 35
```

### Test 2: Check Backend Logs
```
In Railway Dashboard:
1. Click backend service
2. Click "Logs" tab
3. Look for: "ML Service response received" or "Score calculated"
4. No "ML Service timeout" errors? ✓
```

### Test 3: Check ML Service Logs
```
In Railway Dashboard:
1. Click ML service
2. Click "Logs" tab
3. Should see: "POST /predict" request logs
4. No 404 or 500 errors? ✓
```

---

## Troubleshooting ML Service Deployment

### ❌ "Procfile not found"
**Solution:**
```bash
1. Verify Procfile exists in root: ls -la Procfile
2. Content should be: web: cd src/modules/ml && gunicorn --bind 0.0.0.0:$PORT app:app
3. Push to GitHub
4. In Railway, click "Re-trigger Deploy"
```

### ❌ "ModuleNotFoundError: No module named 'flask'"
**Solution:**
```bash
1. Check requirements.txt exists at: src/modules/ml/requirements.txt
2. Verify it has: flask==3.0.3
3. Railway should auto-install from requirements.txt
4. If not, check Python version (should be 3.12)
```

### ❌ "Port 5000 already in use"
**Solution:**
```
Railway auto-assigns appropriate ports, this shouldn't happen.
But if it does:
1. In ML service Variables, set: PORT=8000
2. Update ML_SERVICE_URL to: https://your-service.railway.app
3. Redeploy
```

### ❌ "Backend can't reach ML Service (timeout)"
**Solution:**
```bash
1. Verify ML service is running:
   curl https://your-ml-service.railway.app/health
   
2. Check ML_SERVICE_URL in backend variables:
   - Should be: https://your-ml-service.railway.app (no trailing slash)
   
3. Increase timeout in backend .env:
   ML_SERVICE_TIMEOUT=10000  (was 5000)
   
4. Check ML service logs for errors
```

### ❌ "Build failed: requirements.txt not found"
**Solution:**
```bash
1. Ensure requirements.txt is at: src/modules/ml/requirements.txt
2. Railway looks there by default
3. If in different location, add to root:
   - Copy it or create symlink
4. Push and redeploy
```

### ❌ "502 Bad Gateway"
**Solution:**
```bash
1. ML service might be crashing on startup
2. Check logs for Python errors
3. Try redeploying: Railway dashboard → Redeploy button
4. Check if it's a memory issue (free tier = 512MB)
```

---

## Complete Deployment Checklist

### Before Deployment
- [ ] Procfile created in project root
- [ ] runtime.txt created with Python version
- [ ] requirements.txt exists at src/modules/ml/
- [ ] app.py exists at src/modules/ml/
- [ ] Changes pushed to GitHub

### During Deployment
- [ ] Railway detects Python service
- [ ] Dependencies installed successfully
- [ ] Gunicorn starts without errors
- [ ] Service gets a domain URL

### After Deployment
- [ ] Health check returns 200 OK
- [ ] Prediction endpoint returns fraud_probability
- [ ] Backend .env updated with ML_SERVICE_URL
- [ ] Backend redeployed/restarted
- [ ] Backend logs show successful ML calls
- [ ] Transaction API returns calculations from ML

### Verification
- [ ] `curl /health` returns healthy
- [ ] `curl -X POST /predict` works
- [ ] Backend receives predictions
- [ ] No timeout errors in logs
- [ ] All services communication working

---

## Architecture After Deployment

```
Frontend Request
        ↓
┌──────────────────┐
│  Backend (NestJS)│ ← Railway
│   /transactions  │
└────────┬─────────┘
         │
    ┌────┴──────────────────────────┐
    │                               │
    ▼                               ▼
┌─────────────┐             ┌──────────────────┐
│  MongoDB    │             │  ML Service      │
│  Atlas      │             │  (Python Flask)  │
│  (Cloud DB) │             │  ← Railway       │
└─────────────┘             └──────────────────┘
                                    │
                            ┌───────▼────────┐
                            │ Isolation      │
                            │ Forest Model   │
                            └────────────────┘
```

---

## Environment Variables Summary

### Backend (.env)
```bash
ML_SERVICE_URL=https://your-ml-service.railway.app
ML_SERVICE_TIMEOUT=5000  # or higher if needed
```

### ML Service (Railway Variables)
```bash
PORT=5000
FLASK_ENV=production
FRAUD_RISK_THRESHOLD=70
MEDIUM_RISK_THRESHOLD=40
```

---

## MongoDB Access for ML Service (Optional)

If ML service needs to read from MongoDB for retraining:

```bash
# Add to ML Service Variables:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/upi_fraud_detection
```

Then in `src/modules/ml/app.py`, you can connect:
```python
from pymongo import MongoClient

client = MongoClient(os.getenv('MONGODB_URI'))
db = client['upi_fraud_detection']
transactions = db['transactions']
```

---

## Support & Debugging

### View Detailed Logs
```bash
# In Railway Dashboard:
1. Click ML service
2. Click "Logs" tab
3. Scroll to see real-time logs
4. Look for errors starting with "ERROR:" or "Traceback"
```

### Redeploy ML Service
```
1. Railway Dashboard → ML service
2. Find "Deployments" tab
3. Click latest deployment
4. Click "Redeploy" button
5. Wait 2-3 minutes for new deployment
```

### Test from Command Line
```bash
# Health check
curl -v https://your-ml-service.railway.app/health

# Prediction (with data)
curl -v -X POST https://your-ml-service.railway.app/predict \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100000,
    "senderId": "user_new",
    "recipientId": "user_new",
    "transactionsCount": 1,
    "isNewRecipient": 1,
    "dayOfWeek": 0,
    "hourOfDay": 2
  }'
```

---

## 📌 Common ML Service Endpoints

```
GET  /health                    → ✓ Service is alive
POST /predict                   → Get fraud score
POST /retrain                   → Retrain model (optional)
```

---

## Total Deployment Time
- Add files: 2 minutes
- Push to GitHub: 2 minutes
- Deploy on Railway: 5 minutes
- Test & verify: 2 minutes
- Update .env: 3 minutes

**Total: ~15 minutes**

---

Once ML service is deployed, your entire fraud detection system is live with:
✅ Frontend (Vercel)
✅ Backend (Railway)  
✅ Database (MongoDB Atlas)
✅ Cache (Railway Redis)
✅ ML Service (Railway) ← Just added!

You're complete! 🎉
